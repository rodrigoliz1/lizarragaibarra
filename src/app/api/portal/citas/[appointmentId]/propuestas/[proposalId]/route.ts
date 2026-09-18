import { NextResponse } from "next/server";

import {
  ensureSameOrigin,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { appointmentProposalResponseSchema } from "@/lib/validation";
import { requireActor } from "@/server/policies";
import { respondToAppointmentProposal } from "@/server/services/appointment-negotiation-service";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ appointmentId: string; proposalId: string }> },
) {
  try {
    ensureSameOrigin(request);
    const [params, actor, body] = await Promise.all([
      context.params,
      requireActor(),
      readPublicJson(request),
    ]);
    const parsed = appointmentProposalResponseSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, message: "La respuesta no es válida." },
        { status: 400 },
      );
    const result = await respondToAppointmentProposal(
      actor,
      params.appointmentId,
      params.proposalId,
      parsed.data.action,
    );
    return NextResponse.json({
      ok: true,
      message: result.confirmed ? "Cita confirmada." : "Propuesta rechazada.",
      data: result,
    });
  } catch (error) {
    const status =
      error instanceof RequestSecurityError || error instanceof ServiceError
        ? error.status
        : 500;
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && status !== 500
            ? error.message
            : "No fue posible responder.",
      },
      { status },
    );
  }
}
