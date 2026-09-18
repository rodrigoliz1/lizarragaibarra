import { NextResponse } from "next/server";

import {
  ensureSameOrigin,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { appointmentProposalSchema } from "@/lib/validation";
import { requireActor } from "@/server/policies";
import { proposeAppointment } from "@/server/services/appointment-negotiation-service";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ appointmentId: string }> },
) {
  try {
    ensureSameOrigin(request);
    const [{ appointmentId }, actor, body] = await Promise.all([
      context.params,
      requireActor(),
      readPublicJson(request),
    ]);
    const parsed = appointmentProposalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Revisa los datos de la propuesta.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    await enforceRateLimit({
      request,
      scope: "appointment-proposal",
      limit: 12,
      windowMs: 60 * 60 * 1000,
      secondaryKey: actor.id,
    });
    const proposal = await proposeAppointment(
      actor,
      appointmentId,
      parsed.data,
    );
    return NextResponse.json(
      { ok: true, message: "Propuesta enviada.", data: proposal },
      { status: 201 },
    );
  } catch (error) {
    const status =
      error instanceof RateLimitError
        ? 429
        : error instanceof RequestSecurityError || error instanceof ServiceError
          ? error.status
          : 500;
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && status !== 500
            ? error.message
            : "No fue posible enviar la propuesta.",
      },
      { status },
    );
  }
}
