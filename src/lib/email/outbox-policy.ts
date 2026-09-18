import { createHash } from "node:crypto";

import type { EmailMessage } from "@/lib/email/types";
import {
  decryptSensitiveJson,
  encryptSensitiveJson,
} from "@/lib/security/encryption";

type RuntimeEnvironment = Record<string, string | undefined>;

export type EmailOutboxPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  lockTimeoutMs: number;
  batchSize: number;
};

type StoredEmailPayload = {
  version: 1;
  to: string[];
  text: string;
  html: string;
  replyTo?: string;
  tags?: string[];
  metadata?: Record<string, string>;
};

type OutboxPayloadRecord = {
  recipient: string;
  subject: string;
  template: string;
  payload: unknown;
  encryptedPayload: string | null;
};

function boundedInteger(
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

export function getEmailOutboxPolicy(
  environment: RuntimeEnvironment = process.env,
): EmailOutboxPolicy {
  const baseDelayMs = boundedInteger(
    environment.EMAIL_OUTBOX_BASE_DELAY_MS,
    60_000,
    1_000,
    3_600_000,
  );
  const maxDelayMs = Math.max(
    baseDelayMs,
    boundedInteger(
      environment.EMAIL_OUTBOX_MAX_DELAY_MS,
      3_600_000,
      1_000,
      86_400_000,
    ),
  );
  return {
    maxAttempts: boundedInteger(
      environment.EMAIL_OUTBOX_MAX_ATTEMPTS,
      5,
      1,
      20,
    ),
    baseDelayMs,
    maxDelayMs,
    lockTimeoutMs: boundedInteger(
      environment.EMAIL_OUTBOX_LOCK_TIMEOUT_MS,
      120_000,
      30_000,
      1_800_000,
    ),
    batchSize: boundedInteger(environment.EMAIL_OUTBOX_BATCH_SIZE, 25, 1, 100),
  };
}

export function emailRetryDelayMs(
  attempts: number,
  policy: Pick<EmailOutboxPolicy, "baseDelayMs" | "maxDelayMs">,
) {
  const exponent = Math.max(0, Math.min(30, Math.floor(attempts) - 1));
  return Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** exponent);
}

export function emailNextAttemptAt(
  now: Date,
  attempts: number,
  policy: Pick<EmailOutboxPolicy, "baseDelayMs" | "maxDelayMs">,
) {
  return new Date(now.getTime() + emailRetryDelayMs(attempts, policy));
}

export function emailFailureDisposition(
  now: Date,
  attempts: number,
  policy: Pick<EmailOutboxPolicy, "baseDelayMs" | "maxAttempts" | "maxDelayMs">,
) {
  const exhausted = attempts >= policy.maxAttempts;
  return {
    status: exhausted ? ("DEAD_LETTER" as const) : ("FAILED" as const),
    nextAttemptAt: exhausted ? null : emailNextAttemptAt(now, attempts, policy),
  };
}

function normalizedRecipients(to: EmailMessage["to"]) {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((recipient) => recipient.trim())
    .filter(Boolean);
  if (recipients.length === 0) {
    throw new Error("El correo no contiene destinatarios válidos.");
  }
  return recipients;
}

export function buildEmailIdempotencyKey(
  message: EmailMessage,
  providedKey?: string,
) {
  if (providedKey === undefined) return null;
  const normalized = providedKey.trim();
  if (
    normalized.length === 0 ||
    normalized.length > 200 ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error("La clave de idempotencia del correo no es válida.");
  }
  const recipients = normalizedRecipients(message.to)
    .map((recipient) => recipient.toLowerCase())
    .sort();
  return createHash("sha256")
    .update(
      JSON.stringify([
        "xs-email-outbox-v1",
        message.template,
        recipients,
        normalized,
      ]),
    )
    .digest("hex");
}

function storedPayload(message: EmailMessage): StoredEmailPayload {
  return {
    version: 1,
    to: normalizedRecipients(message.to),
    text: message.text,
    html: message.html,
    replyTo: message.replyTo,
    tags: message.tags,
    metadata: message.metadata,
  };
}

export function encryptEmailMessagePayload(
  message: EmailMessage,
  environment: RuntimeEnvironment = process.env,
) {
  return encryptSensitiveJson(storedPayload(message), environment);
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function stringRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export function emailMessageFromOutboxRecord(
  outbox: OutboxPayloadRecord,
  environment: RuntimeEnvironment = process.env,
): EmailMessage {
  const raw = outbox.encryptedPayload
    ? decryptSensitiveJson<unknown>(outbox.encryptedPayload, environment)
    : outbox.payload;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("El correo pendiente no contiene un payload válido.");
  }
  const stored = raw as Record<string, unknown>;
  const to =
    strings(stored.to)
      ?.map((recipient) => recipient.trim())
      .filter(Boolean) ??
    outbox.recipient
      .split(",")
      .map((recipient) => recipient.trim())
      .filter(Boolean);
  if (
    to.length === 0 ||
    typeof stored.text !== "string" ||
    typeof stored.html !== "string"
  ) {
    throw new Error("El correo pendiente no contiene datos reenviables.");
  }
  return {
    to,
    subject: outbox.subject,
    template: outbox.template,
    text: stored.text,
    html: stored.html,
    replyTo: typeof stored.replyTo === "string" ? stored.replyTo : undefined,
    tags: strings(stored.tags),
    metadata: stringRecord(stored.metadata),
  };
}
