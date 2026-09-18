import { Prisma, TokenType, UserStatus } from "@prisma/client";
import { createHash } from "node:crypto";

import { PRIVACY_CONTENT, TERMS_CONTENT } from "@/data/legal-documents";
import { db } from "@/lib/db";
import { renderTransactionalEmail, sendTrackedEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { hashPassword } from "@/lib/security/passwords";
import { createSecureToken, hashToken } from "@/lib/security/tokens";
import type { InvitedAccountInput } from "@/lib/validation";
import { hasPermission, type PolicyActor } from "@/server/policies";
import { AccessDeniedError, ServiceError } from "@/server/services/errors";

const legalContentHashes = {
  privacy: createHash("sha256").update(PRIVACY_CONTENT).digest("hex"),
  terms: createHash("sha256").update(TERMS_CONTENT).digest("hex"),
};

function inviteExpiry() {
  const hours = Number(process.env.ACCOUNT_INVITE_EXPIRY_HOURS || 48);
  const safeHours = Number.isFinite(hours)
    ? Math.min(168, Math.max(1, hours))
    : 48;
  return new Date(Date.now() + safeHours * 60 * 60 * 1000);
}

function assertCanCreate(actor: PolicyActor, input: InvitedAccountInput) {
  if (actor.role === "ADMIN") return;
  if (input.role === "CLIENT" && hasPermission(actor, "CREATE_CLIENT")) return;
  if (
    input.role === "LAWYER" &&
    input.rank === "ASSOCIATE" &&
    hasPermission(actor, "CREATE_ASSOCIATE")
  ) {
    return;
  }
  throw new AccessDeniedError();
}

function invitationTemplate(input: InvitedAccountInput, activationUrl: string) {
  const label =
    input.role === "CLIENT"
      ? "cliente"
      : input.rank === "PARTNER"
        ? "socio"
        : input.role === "LAWYER"
          ? "profesional"
          : "administrador";
  return renderTransactionalEmail({
    eyebrow: "Invitación personal",
    title: "Activa tu cuenta en LIZÁRRAGA & IBARRA ABOGADOS",
    greeting: `Hola ${input.name},`,
    paragraphs: [
      `Se creó una cuenta individual de ${label} para ti. Define tu propia contraseña mediante el enlace seguro.`,
      "El enlace es de un solo uso y caduca automáticamente. LIZÁRRAGA & IBARRA ABOGADOS nunca te enviará una contraseña temporal por correo.",
    ],
    action: { label: "Activar cuenta", url: activationUrl },
    notice: "Este enlace es personal. No lo compartas ni lo reenvíes.",
  });
}

export async function createInvitedAccount(
  actor: PolicyActor,
  input: InvitedAccountInput,
) {
  assertCanCreate(actor, input);
  const { token, tokenHash } = createSecureToken();
  let created: { id: string; email: string; status: UserStatus };
  try {
    created = await db.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: null,
          role: input.role,
          status: UserStatus.INVITED,
          ...(input.role === "CLIENT"
            ? {
                clientProfile: {
                  create: {
                    phone: input.phone || null,
                    company: input.company,
                  },
                },
              }
            : {}),
          ...(input.role === "LAWYER"
            ? {
                lawyerProfile: {
                  create: {
                    slug: input.slug!,
                    displayName: input.name,
                    position:
                      input.position ||
                      (input.rank === "PARTNER" ? "Socio" : "Asociado"),
                    rank: input.rank!,
                    phone: input.phone || null,
                    bio: input.bio,
                    education: input.education,
                    active: input.publicProfile,
                    supervisorId: input.supervisorId || null,
                    areas: {
                      create: input.practiceAreaIds.map(
                        (practiceAreaId, index) => ({
                          practiceAreaId,
                          isPrimary: index === 0,
                        }),
                      ),
                    },
                  },
                },
              }
            : {}),
          actionTokens: {
            create: {
              email: input.email,
              type: TokenType.ACCOUNT_INVITE,
              tokenHash,
              expiresAt: inviteExpiry(),
              createdById: actor.id,
              lastSentAt: input.sendInvite ? new Date() : null,
            },
          },
        },
        select: { id: true, email: true, status: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "USER_INVITED",
          entityType: "User",
          entityId: user.id,
          metadata: { role: input.role, rank: input.rank ?? null },
        },
      });
      return user;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ServiceError(
        "Ya existe una cuenta o perfil con esos datos.",
        409,
        "ACCOUNT_EXISTS",
      );
    }
    throw error;
  }

  let invitationSent = false;
  if (input.sendInvite) {
    const activationUrl = new URL("/portal/activar", getSiteUrl());
    activationUrl.searchParams.set("token", token);
    const content = invitationTemplate(input, activationUrl.toString());
    invitationSent = await sendTrackedEmail({
      to: input.email,
      subject: "Activa tu cuenta de LIZÁRRAGA & IBARRA ABOGADOS",
      template:
        input.role === "CLIENT"
          ? "client-invitation"
          : input.rank === "PARTNER"
            ? "partner-invitation"
            : input.role === "LAWYER"
              ? "lawyer-invitation"
              : "admin-invitation",
      ...content,
      tags: ["account", "invitation"],
    })
      .then(() => true)
      .catch(() => false);
  }

  return { ...created, invitationSent };
}

export async function activateAccount(
  token: string,
  password: string,
  legalAccepted: true,
) {
  if (!legalAccepted) {
    throw new ServiceError(
      "Debes confirmar la lectura de los documentos jurídicos.",
      400,
      "LEGAL_ACCEPTANCE_REQUIRED",
    );
  }
  const tokenHash = hashToken(token);
  const actionToken = await db.actionToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      email: true,
      type: true,
      usedAt: true,
      expiresAt: true,
      user: { select: { name: true, status: true } },
    },
  });
  if (
    !actionToken?.userId ||
    actionToken.type !== TokenType.ACCOUNT_INVITE ||
    actionToken.usedAt ||
    actionToken.expiresAt <= new Date() ||
    actionToken.user?.status !== UserStatus.INVITED
  ) {
    throw new ServiceError(
      "La invitación es inválida, ya fue utilizada o ha vencido.",
      400,
      "INVALID_INVITE",
    );
  }
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (transaction) => {
    const claimed = await transaction.actionToken.updateMany({
      where: {
        id: actionToken.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new ServiceError(
        "La invitación ya no está disponible.",
        409,
        "INVITE_USED",
      );
    }
    const activated = await transaction.user.updateMany({
      where: { id: actionToken.userId!, status: UserStatus.INVITED },
      data: {
        passwordHash,
        status: UserStatus.ACTIVE,
        sessionVersion: { increment: 1 },
      },
    });
    if (activated.count !== 1)
      throw new ServiceError(
        "La invitación ya no está disponible.",
        409,
        "INVITE_USED",
      );
    const publishedAt = new Date("2026-09-17T00:00:00.000Z");
    const [privacyVersion, termsVersion] = await Promise.all([
      transaction.legalDocumentVersion.upsert({
        where: { type_version: { type: "PRIVACY", version: "2026-09-17" } },
        update: { active: true },
        create: {
          type: "PRIVACY",
          version: "2026-09-17",
          publishedAt,
          contentHash: legalContentHashes.privacy,
          active: true,
        },
      }),
      transaction.legalDocumentVersion.upsert({
        where: { type_version: { type: "TERMS", version: "2026-09-17" } },
        update: { active: true },
        create: {
          type: "TERMS",
          version: "2026-09-17",
          publishedAt,
          contentHash: legalContentHashes.terms,
          active: true,
        },
      }),
    ]);
    await transaction.legalAcceptance.createMany({
      data: [privacyVersion, termsVersion].map((documentVersion) => ({
        userId: actionToken.userId!,
        documentVersionId: documentVersion.id,
      })),
      skipDuplicates: true,
    });
    await transaction.actionToken.updateMany({
      where: {
        userId: actionToken.userId,
        type: TokenType.ACCOUNT_INVITE,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actionToken.userId,
        action: "ACCOUNT_ACTIVATED",
        entityType: "User",
        entityId: actionToken.userId!,
      },
    });
  });

  const content = renderTransactionalEmail({
    eyebrow: "Cuenta activada",
    title: "Tu acceso está listo",
    greeting: `Hola ${actionToken.user.name},`,
    paragraphs: ["Tu cuenta personal quedó activada correctamente."],
    action: {
      label: "Iniciar sesión",
      url: new URL("/portal/iniciar-sesion", getSiteUrl()).toString(),
    },
  });
  await sendTrackedEmail({
    to: actionToken.email,
    subject: "Tu cuenta de LIZÁRRAGA & IBARRA ABOGADOS está activa",
    template: "account-activated",
    ...content,
    tags: ["account", "activated"],
  }).catch(() => undefined);
}

export async function changeUserStatus(
  actor: PolicyActor,
  userId: string,
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED",
) {
  if (actor.role !== "ADMIN") throw new AccessDeniedError();
  if (actor.id === userId && status !== "ACTIVE") {
    throw new ServiceError(
      "No puedes suspender tu propia sesión.",
      409,
      "SELF_SUSPEND",
    );
  }
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { status, sessionVersion: { increment: 1 } },
    }),
    db.auditLog.create({
      data: {
        actorId: actor.id,
        action: `USER_${status}`,
        entityType: "User",
        entityId: userId,
      },
    }),
  ]);
}

export async function resendAccountInvitation(
  actor: PolicyActor,
  userId: string,
) {
  if (actor.role !== "ADMIN" && actor.lawyerRank !== "PARTNER")
    throw new AccessDeniedError();
  const user = await db.user.findFirst({
    where: {
      id: userId,
      status: "INVITED",
      ...(actor.role === "ADMIN"
        ? {}
        : {
            OR: [
              { actionTokens: { some: { createdById: actor.id } } },
              ...(actor.lawyerProfileId
                ? [
                    { lawyerProfile: { supervisorId: actor.lawyerProfileId } },
                    {
                      clientProfile: {
                        matters: {
                          some: {
                            assignments: {
                              some: { lawyerId: actor.lawyerProfileId },
                            },
                          },
                        },
                      },
                    },
                  ]
                : []),
            ],
          }),
    },
    include: { lawyerProfile: { select: { rank: true } } },
  });
  if (!user)
    throw new ServiceError(
      "La cuenta ya no admite invitaciones.",
      409,
      "INVITE_NOT_AVAILABLE",
    );
  if (
    actor.role !== "ADMIN" &&
    (user.role === "ADMIN" || user.lawyerProfile?.rank === "PARTNER")
  )
    throw new AccessDeniedError();
  const { token, tokenHash } = createSecureToken();
  await db.$transaction(async (transaction) => {
    await transaction.actionToken.updateMany({
      where: { userId, type: "ACCOUNT_INVITE", usedAt: null },
      data: { usedAt: new Date() },
    });
    await transaction.actionToken.create({
      data: {
        userId,
        email: user.email,
        type: "ACCOUNT_INVITE",
        tokenHash,
        expiresAt: inviteExpiry(),
        createdById: actor.id,
        lastSentAt: new Date(),
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ACCOUNT_INVITE_REISSUED",
        entityType: "User",
        entityId: userId,
      },
    });
  });
  const activationUrl = new URL("/portal/activar", getSiteUrl());
  activationUrl.searchParams.set("token", token);
  const content = renderTransactionalEmail({
    eyebrow: "Nueva invitación",
    title: "Activa tu cuenta en LIZÁRRAGA & IBARRA ABOGADOS",
    greeting: `Hola ${user.name},`,
    paragraphs: [
      "Se emitió un nuevo enlace de activación. Los enlaces anteriores dejaron de ser válidos.",
      "Define tu propia contraseña; nunca enviamos contraseñas temporales.",
    ],
    action: { label: "Activar cuenta", url: activationUrl.toString() },
    notice: "Este enlace es personal, de un solo uso y con caducidad.",
  });
  const sent = await sendTrackedEmail({
    to: user.email,
    subject: "Nueva invitación a LIZÁRRAGA & IBARRA ABOGADOS",
    template:
      user.role === "CLIENT"
        ? "client-invitation"
        : user.lawyerProfile?.rank === "PARTNER"
          ? "partner-invitation"
          : "lawyer-invitation",
    ...content,
    tags: ["account", "invitation", "retry"],
  })
    .then(() => true)
    .catch(() => false);
  return { sent };
}

export async function revokeAccountInvitation(
  actor: PolicyActor,
  userId: string,
) {
  if (actor.role !== "ADMIN" && actor.lawyerRank !== "PARTNER")
    throw new AccessDeniedError();
  const user = await db.user.findFirst({
    where: {
      id: userId,
      status: "INVITED",
      ...(actor.role === "ADMIN"
        ? {}
        : {
            OR: [
              { actionTokens: { some: { createdById: actor.id } } },
              ...(actor.lawyerProfileId
                ? [
                    { lawyerProfile: { supervisorId: actor.lawyerProfileId } },
                    {
                      clientProfile: {
                        matters: {
                          some: {
                            assignments: {
                              some: { lawyerId: actor.lawyerProfileId },
                            },
                          },
                        },
                      },
                    },
                  ]
                : []),
            ],
          }),
    },
    include: { lawyerProfile: { select: { rank: true } } },
  });
  if (!user)
    throw new ServiceError(
      "La cuenta ya no tiene una invitación revocable.",
      409,
      "INVITE_NOT_AVAILABLE",
    );
  if (
    actor.role !== "ADMIN" &&
    (user.role === "ADMIN" || user.lawyerProfile?.rank === "PARTNER")
  )
    throw new AccessDeniedError();
  await db.$transaction(async (transaction) => {
    await transaction.actionToken.updateMany({
      where: { userId, type: "ACCOUNT_INVITE", usedAt: null },
      data: { usedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ACCOUNT_INVITE_REVOKED",
        entityType: "User",
        entityId: userId,
      },
    });
  });
}
