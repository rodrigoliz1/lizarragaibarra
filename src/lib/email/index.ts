import "server-only";

import { randomUUID } from "node:crypto";

import { EmailDeliveryStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import {
  buildEmailIdempotencyKey,
  emailFailureDisposition,
  emailMessageFromOutboxRecord,
  encryptEmailMessagePayload,
  getEmailOutboxPolicy,
} from "@/lib/email/outbox-policy";
import {
  BrevoEmailProvider,
  MockEmailProvider,
  ResendEmailProvider,
} from "@/lib/email/providers";
import type { EmailMessage, EmailProvider } from "@/lib/email/types";
import {
  getBrevoConfiguration,
  getEmailProviderName,
  isMockEmailAllowed,
  type RuntimeEnvironment,
} from "@/lib/environment";
import { encryptSensitiveJson } from "@/lib/security/encryption";

export * from "./types";
export * from "./template";
export {
  buildEmailIdempotencyKey,
  emailRetryDelayMs,
  getEmailOutboxPolicy,
} from "./outbox-policy";

type ProcessOptions = {
  environment?: RuntimeEnvironment;
  force?: boolean;
  now?: Date;
  provider?: EmailProvider;
  workerId?: string;
};

export type SendTrackedEmailOptions = {
  environment?: RuntimeEnvironment;
  idempotencyKey?: string;
  now?: Date;
  provider?: EmailProvider;
  workerId?: string;
};

export type EmailOutboxProcessResult = {
  outboxId: string;
  status: EmailDeliveryStatus | "SKIPPED";
  providerId?: string;
  error?: string;
};

const deliverySelect = {
  id: true,
  recipient: true,
  subject: true,
  template: true,
  payload: true,
  encryptedPayload: true,
  attempts: true,
} satisfies Prisma.EmailOutboxSelect;

export function getEmailProvider(
  environment: RuntimeEnvironment = process.env,
): EmailProvider {
  const provider = getEmailProviderName(environment);
  if (provider === "mock") {
    if (!isMockEmailAllowed(environment)) {
      throw new Error("EMAIL_PROVIDER=mock no está permitido en producción.");
    }
    return new MockEmailProvider();
  }
  if (provider === "resend") {
    const apiKey = environment.RESEND_API_KEY?.trim();
    const from = environment.EMAIL_FROM?.trim();
    if (!apiKey || !from) {
      throw new Error("La configuración de Resend está incompleta.");
    }
    return new ResendEmailProvider(apiKey, from);
  }
  const configuration = getBrevoConfiguration(environment);
  return new BrevoEmailProvider(
    configuration.apiKey,
    configuration.fromAddress,
    configuration.fromName,
    {
      replyTo: configuration.replyTo,
      sandboxMode: configuration.sandboxMode,
    },
  );
}

function safeProviderError(provider?: EmailProvider) {
  return provider
    ? `El proveedor ${provider.name} no pudo completar el envío.`
    : "La configuración del proveedor de correo no está disponible.";
}

function scheduledDueWhere(now: Date): Prisma.EmailOutboxWhereInput {
  return {
    status: {
      in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.FAILED],
    },
    OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
  };
}

function staleProcessingWhere(staleBefore: Date): Prisma.EmailOutboxWhereInput {
  return {
    status: EmailDeliveryStatus.PROCESSING,
    OR: [{ lockedAt: null }, { lockedAt: { lte: staleBefore } }],
  };
}

async function claimOutboxMessage(
  outboxId: string,
  options: Required<Pick<ProcessOptions, "force" | "now" | "workerId">> & {
    environment: RuntimeEnvironment;
  },
) {
  const policy = getEmailOutboxPolicy(options.environment);
  const staleBefore = new Date(options.now.getTime() - policy.lockTimeoutMs);
  const eligible: Prisma.EmailOutboxWhereInput = options.force
    ? {
        status: {
          in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.FAILED],
        },
      }
    : {
        OR: [scheduledDueWhere(options.now), staleProcessingWhere(staleBefore)],
      };
  const claimed = await db.emailOutbox.updateMany({
    where: {
      id: outboxId,
      attempts: { lt: policy.maxAttempts },
      ...eligible,
    },
    data: {
      status: EmailDeliveryStatus.PROCESSING,
      attempts: { increment: 1 },
      lastAttemptAt: options.now,
      nextAttemptAt: null,
      lockedAt: options.now,
      lockedBy: options.workerId,
      lastError: null,
    },
  });
  if (claimed.count !== 1) return null;
  return db.emailOutbox.findFirst({
    where: {
      id: outboxId,
      status: EmailDeliveryStatus.PROCESSING,
      lockedBy: options.workerId,
    },
    select: deliverySelect,
  });
}

async function promoteLegacyPayload(
  outbox: Prisma.EmailOutboxGetPayload<{ select: typeof deliverySelect }>,
  workerId: string,
  environment: RuntimeEnvironment,
) {
  if (outbox.encryptedPayload || outbox.payload === null) return outbox;
  const encryptedPayload = encryptSensitiveJson(outbox.payload, environment);
  const promoted = await db.emailOutbox.updateMany({
    where: {
      id: outbox.id,
      status: EmailDeliveryStatus.PROCESSING,
      lockedBy: workerId,
      encryptedPayload: null,
    },
    data: {
      encryptedPayload,
      payload: Prisma.DbNull,
    },
  });
  if (promoted.count !== 1) return null;
  return { ...outbox, payload: null, encryptedPayload };
}

async function markDeliveryFailure(
  outbox: Prisma.EmailOutboxGetPayload<{ select: typeof deliverySelect }>,
  workerId: string,
  now: Date,
  environment: RuntimeEnvironment,
  error: string,
): Promise<EmailOutboxProcessResult> {
  const policy = getEmailOutboxPolicy(environment);
  const disposition = emailFailureDisposition(now, outbox.attempts, policy);
  const status =
    disposition.status === "DEAD_LETTER"
      ? EmailDeliveryStatus.DEAD_LETTER
      : EmailDeliveryStatus.FAILED;
  const updated = await db.emailOutbox.updateMany({
    where: {
      id: outbox.id,
      status: EmailDeliveryStatus.PROCESSING,
      lockedBy: workerId,
    },
    data: {
      status,
      lastError: error,
      failedAt: now,
      nextAttemptAt: disposition.nextAttemptAt,
      lockedAt: null,
      lockedBy: null,
    },
  });
  return updated.count === 1
    ? { outboxId: outbox.id, status, error }
    : { outboxId: outbox.id, status: "SKIPPED" };
}

export async function processEmailOutboxMessage(
  outboxId: string,
  options: ProcessOptions = {},
): Promise<EmailOutboxProcessResult> {
  const environment = options.environment ?? process.env;
  const now = options.now ?? new Date();
  const workerId = options.workerId ?? `email-${randomUUID()}`;
  const outbox = await claimOutboxMessage(outboxId, {
    environment,
    force: options.force ?? false,
    now,
    workerId,
  });
  if (!outbox) return { outboxId, status: "SKIPPED" };

  let failureMessage =
    "No fue posible preparar el correo para su entrega transaccional.";
  let provider: EmailProvider;
  let providerResult: { providerId: string };
  try {
    const securedOutbox = await promoteLegacyPayload(
      outbox,
      workerId,
      environment,
    );
    if (!securedOutbox) return { outboxId, status: "SKIPPED" };
    const message = emailMessageFromOutboxRecord(securedOutbox, environment);
    provider = options.provider ?? getEmailProvider(environment);
    failureMessage = safeProviderError(provider);
    providerResult = await provider.send(message);
  } catch {
    return markDeliveryFailure(
      outbox,
      workerId,
      now,
      environment,
      failureMessage,
    );
  }
  const status =
    provider.name === "mock"
      ? EmailDeliveryStatus.MOCKED
      : EmailDeliveryStatus.SENT;
  const completed = await db.emailOutbox.updateMany({
    where: {
      id: outbox.id,
      status: EmailDeliveryStatus.PROCESSING,
      lockedBy: workerId,
    },
    data: {
      status,
      providerId: providerResult.providerId,
      lastError: null,
      sentAt: now,
      failedAt: null,
      nextAttemptAt: null,
      lockedAt: null,
      lockedBy: null,
      payload: Prisma.DbNull,
      encryptedPayload: null,
    },
  });
  return completed.count === 1
    ? {
        outboxId: outbox.id,
        status,
        providerId: providerResult.providerId,
      }
    : { outboxId: outbox.id, status: "SKIPPED" };
}

function uniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function sendTrackedEmail(
  message: EmailMessage,
  options: SendTrackedEmailOptions = {},
) {
  const environment = options.environment ?? process.env;
  const now = options.now ?? new Date();
  const recipients = (Array.isArray(message.to) ? message.to : [message.to])
    .map((recipient) => recipient.trim())
    .filter(Boolean);
  const idempotencyKey = buildEmailIdempotencyKey(
    message,
    options.idempotencyKey,
  );
  let outbox: {
    id: string;
    status: EmailDeliveryStatus;
    providerId: string | null;
  };
  let created = false;
  try {
    outbox = await db.emailOutbox.create({
      data: {
        recipient: recipients.join(", "),
        subject: message.subject,
        template: message.template,
        payload: Prisma.DbNull,
        encryptedPayload: encryptEmailMessagePayload(message, environment),
        idempotencyKey,
        status: EmailDeliveryStatus.PENDING,
        nextAttemptAt: now,
      },
      select: { id: true, status: true, providerId: true },
    });
    created = true;
  } catch (error) {
    if (!idempotencyKey || !uniqueConstraintError(error)) throw error;
    outbox = await db.emailOutbox.findUniqueOrThrow({
      where: { idempotencyKey },
      select: { id: true, status: true, providerId: true },
    });
  }

  if (
    outbox.status === EmailDeliveryStatus.SENT ||
    outbox.status === EmailDeliveryStatus.MOCKED
  ) {
    return {
      outboxId: outbox.id,
      status: outbox.status,
      providerId: outbox.providerId ?? `outbox:${outbox.id}`,
    };
  }

  const result = await processEmailOutboxMessage(outbox.id, {
    environment,
    force: created,
    now,
    provider: options.provider,
    workerId: options.workerId,
  });
  if (
    result.status === EmailDeliveryStatus.SENT ||
    result.status === EmailDeliveryStatus.MOCKED
  ) {
    return result;
  }
  if (result.status === "SKIPPED" && !created) {
    const current = await db.emailOutbox.findUniqueOrThrow({
      where: { id: outbox.id },
      select: { status: true, providerId: true },
    });
    return {
      outboxId: outbox.id,
      status: current.status,
      providerId: current.providerId ?? `outbox:${outbox.id}`,
    };
  }
  throw new Error(
    result.error ?? "El correo quedó pendiente de un reintento seguro.",
  );
}

export async function retryTrackedEmail(
  outboxId: string,
  environment: RuntimeEnvironment = process.env,
) {
  const now = new Date();
  const policy = getEmailOutboxPolicy(environment);
  const outbox = await db.emailOutbox.findUnique({
    where: { id: outboxId },
    select: { status: true, attempts: true },
  });
  if (
    !outbox ||
    (outbox.status !== EmailDeliveryStatus.FAILED &&
      outbox.status !== EmailDeliveryStatus.DEAD_LETTER)
  ) {
    throw new Error("El correo ya fue reenviado o no está disponible.");
  }
  const resetAttempts =
    outbox.status === EmailDeliveryStatus.DEAD_LETTER ||
    outbox.attempts >= policy.maxAttempts;
  const requeued = await db.emailOutbox.updateMany({
    where: { id: outboxId, status: outbox.status },
    data: {
      status: EmailDeliveryStatus.PENDING,
      attempts: resetAttempts ? 0 : outbox.attempts,
      lastError: null,
      failedAt: null,
      nextAttemptAt: now,
      lockedAt: null,
      lockedBy: null,
    },
  });
  if (requeued.count !== 1) {
    throw new Error("El correo ya fue reenviado o no está disponible.");
  }
  return {
    outboxId,
    status: EmailDeliveryStatus.PENDING,
    resetAttempts,
  };
}

type BatchOptions = Pick<ProcessOptions, "environment" | "now" | "provider"> & {
  batchSize?: number;
  workerId?: string;
};

export async function processEmailOutboxBatch(options: BatchOptions = {}) {
  const environment = options.environment ?? process.env;
  const now = options.now ?? new Date();
  const policy = getEmailOutboxPolicy(environment);
  const batchSize = Math.min(
    100,
    Math.max(1, options.batchSize ?? policy.batchSize),
  );
  const workerId = options.workerId ?? `email-batch-${randomUUID()}`;
  const staleBefore = new Date(now.getTime() - policy.lockTimeoutMs);

  const scrubbedTerminal = await db.emailOutbox.updateMany({
    where: {
      status: {
        in: [EmailDeliveryStatus.SENT, EmailDeliveryStatus.MOCKED],
      },
      OR: [
        { encryptedPayload: { not: null } },
        { payload: { not: Prisma.AnyNull } },
      ],
    },
    data: {
      payload: Prisma.DbNull,
      encryptedPayload: null,
      nextAttemptAt: null,
      lockedAt: null,
      lockedBy: null,
    },
  });

  await db.emailOutbox.updateMany({
    where: {
      attempts: { gte: policy.maxAttempts },
      OR: [
        {
          status: {
            in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.FAILED],
          },
        },
        staleProcessingWhere(staleBefore),
      ],
    },
    data: {
      status: EmailDeliveryStatus.DEAD_LETTER,
      failedAt: now,
      nextAttemptAt: null,
      lockedAt: null,
      lockedBy: null,
      lastError: "Se agotó el máximo de intentos de entrega.",
    },
  });

  const candidates = await db.emailOutbox.findMany({
    where: {
      attempts: { lt: policy.maxAttempts },
      OR: [scheduledDueWhere(now), staleProcessingWhere(staleBefore)],
    },
    select: { id: true },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: batchSize,
  });
  const summary = {
    scrubbedTerminal: scrubbedTerminal.count,
    selected: candidates.length,
    processed: 0,
    sent: 0,
    mocked: 0,
    failed: 0,
    deadLetter: 0,
    skipped: 0,
  };
  for (const candidate of candidates) {
    const result = await processEmailOutboxMessage(candidate.id, {
      environment,
      now: options.now ?? new Date(),
      provider: options.provider,
      workerId,
    });
    if (result.status === "SKIPPED") {
      summary.skipped += 1;
      continue;
    }
    summary.processed += 1;
    if (result.status === EmailDeliveryStatus.SENT) summary.sent += 1;
    if (result.status === EmailDeliveryStatus.MOCKED) summary.mocked += 1;
    if (result.status === EmailDeliveryStatus.FAILED) summary.failed += 1;
    if (result.status === EmailDeliveryStatus.DEAD_LETTER) {
      summary.deadLetter += 1;
    }
  }
  return summary;
}
