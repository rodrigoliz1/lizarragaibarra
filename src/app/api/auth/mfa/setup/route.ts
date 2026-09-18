import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { encryptSensitiveString } from "@/lib/security/encryption";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { ensureSameOrigin } from "@/lib/security/request";
import { generateTotpSecret, totpProvisioningUri } from "@/lib/security/totp";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const session = await auth();
    if (!session?.user?.id || !session.user.active) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 });
    }
    await enforceRateLimit({
      request,
      scope: "mfa-enrollment",
      limit: 5,
      windowMs: 15 * 60 * 1000,
      secondaryKey: session.user.id,
    });
    const current = await db.user.findFirst({
      where: { id: session.user.id, status: "ACTIVE" },
      select: { email: true, mfaEnabled: true },
    });
    if (!current) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 });
    }
    if (current.mfaEnabled) {
      return NextResponse.json(
        { message: "MFA ya está habilitado en esta cuenta." },
        { status: 409 },
      );
    }
    const secret = generateTotpSecret();
    await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data: { mfaPendingEncrypted: encryptSensitiveString(secret) },
      }),
      db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "MFA_ENROLLMENT_STARTED",
          entityType: "User",
          entityId: session.user.id,
        },
      }),
    ]);
    return NextResponse.json(
      {
        secret,
        provisioningUri: totpProvisioningUri({
          secret,
          account: current.email,
          issuer:
            process.env.MFA_ISSUER?.trim() || "LIZÁRRAGA & IBARRA ABOGADOS",
        }),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const rateLimitError = error instanceof RateLimitError ? error : null;
    const status = rateLimitError ? 429 : 400;
    return NextResponse.json(
      {
        message: rateLimitError?.message ?? "No fue posible iniciar MFA.",
      },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
