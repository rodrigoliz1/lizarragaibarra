import { TokenType } from "@prisma/client";

import { db } from "@/lib/db";
import { renderTransactionalEmail, sendTrackedEmail } from "@/lib/email";
import { isDemoAuthAllowed } from "@/lib/environment";
import { getSiteUrl } from "@/lib/site-url";
import { hashPassword } from "@/lib/security/passwords";
import { isPasswordResetTokenUsable } from "@/lib/security/password-reset";
import { createSecureToken, hashToken } from "@/lib/security/tokens";
import { ServiceError } from "@/server/services/errors";

function demoAccountBlocked(email: string) {
  return email.endsWith("@li.test") && !isDemoAuthAllowed();
}

export async function requestPasswordReset(email: string) {
  const user = await db.user.findFirst({
    where: { email, status: "ACTIVE" },
    select: { id: true, name: true, email: true },
  });
  if (!user || demoAccountBlocked(user.email)) return;

  const { token, tokenHash } = createSecureToken();
  const expiryMinutes = Math.min(
    120,
    Math.max(10, Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES || 30)),
  );
  await db.actionToken.create({
    data: {
      userId: user.id,
      email: user.email,
      type: TokenType.PASSWORD_RESET,
      tokenHash,
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    },
  });
  const resetUrl = new URL("/portal/restablecer", getSiteUrl());
  resetUrl.searchParams.set("token", token);
  const resetEmail = renderTransactionalEmail({
    eyebrow: "Acceso privado",
    title: "Restablecimiento de contraseña",
    greeting: `Hola ${user.name},`,
    paragraphs: [
      "Recibimos una solicitud para restablecer la contraseña de su cuenta.",
      `El enlace vence en ${expiryMinutes} minutos y solo puede utilizarse una vez. Si usted no hizo esta solicitud, ignore este mensaje.`,
    ],
    action: {
      label: "Restablecer contraseña",
      url: resetUrl.toString(),
    },
    notice:
      "Este mensaje contiene un enlace de seguridad. No lo comparta ni reenvíe.",
  });
  await sendTrackedEmail({
    to: user.email,
    subject: "Restablece tu acceso a LIZÁRRAGA & IBARRA ABOGADOS",
    template: "password-reset",
    ...resetEmail,
    tags: ["security", "password-reset"],
  }).catch(() => undefined);
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashToken(token);
  const actionToken = await db.actionToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      email: true,
      type: true,
      expiresAt: true,
      usedAt: true,
    },
  });
  if (
    !actionToken ||
    !isPasswordResetTokenUsable(actionToken) ||
    demoAccountBlocked(actionToken.email)
  ) {
    throw new ServiceError(
      "La liga es inválida o ha vencido.",
      400,
      "INVALID_RESET_TOKEN",
    );
  }
  if (!actionToken?.userId) {
    throw new ServiceError(
      "La liga es inválida o ha vencido.",
      400,
      "INVALID_RESET_TOKEN",
    );
  }
  const userId = actionToken.userId;
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
        "La liga es inválida o ha vencido.",
        400,
        "INVALID_RESET_TOKEN",
      );
    }
    await transaction.user.update({
      where: { id: userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
  });
}
