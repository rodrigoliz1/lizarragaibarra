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

const schema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const session = await auth();
    if (
      !session?.user?.id ||
      !session.user.active ||
      !session.user.mfaEnabled ||
      !session.user.mfaVerified
    ) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 });
    }
    await enforceRateLimit({
      request,
      scope: "mfa-recovery-regeneration",
      limit: 3,
      windowMs: 30 * 60 * 1000,
      secondaryKey: session.user.id,
    });
    const parsed = schema.safeParse(await readPublicJson(request));
    const user = await db.user.findFirst({
      where: { id: session.user.id, status: "ACTIVE", mfaEnabled: true },
      select: { mfaSecretEncrypted: true },
    });
    if (
      !parsed.success ||
      !user?.mfaSecretEncrypted ||
      !verifyTotp(
        decryptSensitiveString(user.mfaSecretEncrypted),
        parsed.data.code,
      )
    ) {
      return NextResponse.json(
        { message: "El código no es válido o expiró." },
        { status: 400 },
      );
    }
    const recoveryCodes = generateRecoveryCodes();
    await db.$transaction(async (transaction) => {
      await transaction.mfaRecoveryCode.deleteMany({
        where: { userId: session.user.id },
      });
      await transaction.mfaRecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({
          userId: session.user.id,
          codeHash: hashRecoveryCode(code),
        })),
      });
      await transaction.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "MFA_RECOVERY_CODES_REGENERATED",
          entityType: "User",
          entityId: session.user.id,
          metadata: { count: recoveryCodes.length },
        },
      });
    });
    return NextResponse.json(
      { recoveryCodes, message: "Códigos regenerados." },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const rateLimitError = error instanceof RateLimitError ? error : null;
    return NextResponse.json(
      {
        message:
          rateLimitError?.message ?? "No fue posible regenerar los códigos.",
      },
      {
        status: rateLimitError ? 429 : 400,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}
