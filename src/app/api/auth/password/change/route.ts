import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security/passwords";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { ensureSameOrigin, readPublicJson } from "@/lib/security/request";
import { passwordChangeSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const session = await auth();
    if (
      !session?.user?.id ||
      !session.user.active ||
      (session.user.mfaRequired && !session.user.mfaVerified)
    ) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 });
    }
    await enforceRateLimit({
      request,
      scope: "password-change",
      limit: 5,
      windowMs: 30 * 60 * 1000,
      secondaryKey: session.user.id,
    });
    const parsed = passwordChangeSchema.safeParse(
      await readPublicJson(request),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Revise la contraseña nueva.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const user = await db.user.findFirst({
      where: { id: session.user.id, status: "ACTIVE" },
      select: { passwordHash: true },
    });
    if (
      !user?.passwordHash ||
      !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))
    ) {
      return NextResponse.json(
        { message: "No fue posible validar la contraseña actual." },
        { status: 400 },
      );
    }
    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: session.user.id },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await transaction.userSession.updateMany({
        where: { userId: session.user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "AUTH_PASSWORD_CHANGED",
          entityType: "User",
          entityId: session.user.id,
        },
      });
    });
    return NextResponse.json(
      { message: "Contraseña actualizada. Inicie sesión nuevamente." },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const rateLimitError = error instanceof RateLimitError ? error : null;
    return NextResponse.json(
      {
        message:
          rateLimitError?.message ?? "No fue posible actualizar la contraseña.",
      },
      { status: rateLimitError ? 429 : 400 },
    );
  }
}
