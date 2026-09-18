import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { decryptSensitiveString } from "@/lib/security/encryption";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { ensureSameOrigin, readPublicJson } from "@/lib/security/request";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
} from "@/lib/security/totp";

const confirmationSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const session = await auth();
    if (!session?.user?.id || !session.user.active) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 });
    }
    await enforceRateLimit({
      request,
      scope: "mfa-confirmation",
      limit: 8,
      windowMs: 15 * 60 * 1000,
      secondaryKey: session.user.id,
    });
    const parsed = confirmationSchema.safeParse(await readPublicJson(request));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "El código no es válido." },
        { status: 400 },
      );
    }
    const current = await db.user.findFirst({
      where: { id: session.user.id, status: "ACTIVE", mfaEnabled: false },
      select: { mfaPendingEncrypted: true },
    });
    if (!current?.mfaPendingEncrypted) {
      return NextResponse.json(
        { message: "Primero inicie la configuración de MFA." },
        { status: 409 },
      );
    }
    const secret = decryptSensitiveString(current.mfaPendingEncrypted);
    if (!verifyTotp(secret, parsed.data.code)) {
      return NextResponse.json(
        { message: "El código no es válido o expiró." },
        { status: 400 },
      );
    }
    const recoveryCodes = generateRecoveryCodes();
    const recoveryRows = recoveryCodes.map((code) => ({
      userId: session.user.id,
      codeHash: hashRecoveryCode(code),
    }));
    await db.$transaction(async (transaction) => {
      await transaction.mfaRecoveryCode.deleteMany({
        where: { userId: session.user.id },
      });
      await transaction.mfaRecoveryCode.createMany({ data: recoveryRows });
      await transaction.user.update({
        where: { id: session.user.id },
        data: {
          mfaEnabled: true,
          mfaSecretEncrypted: current.mfaPendingEncrypted,
          mfaPendingEncrypted: null,
          mfaEnrolledAt: new Date(),
          sessionVersion: { increment: 1 },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "MFA_ENABLED",
          entityType: "User",
          entityId: session.user.id,
          metadata: { recoveryCodesIssued: recoveryCodes.length },
        },
      });
    });
    return NextResponse.json(
      {
        message: "MFA quedó habilitado. Guarde estos códigos ahora.",
        recoveryCodes,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const rateLimitError = error instanceof RateLimitError ? error : null;
    const status = rateLimitError ? 429 : 400;
    return NextResponse.json(
      {
        message: rateLimitError?.message ?? "No fue posible confirmar MFA.",
      },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
