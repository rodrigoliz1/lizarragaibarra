import {
  ensureSameOrigin,
  publicApiResponse,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import {
  appointmentRescheduleRequestSchema,
  zodFieldErrors,
} from "@/lib/validation";
import { requestAppointmentReschedule } from "@/server/services/appointment-management-service";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const parsed = appointmentRescheduleRequestSchema.safeParse(
      await readPublicJson(request),
    );
    if (!parsed.success) {
      return publicApiResponse(
        {
          ok: false,
          message: "La solicitud no es válida.",
          fieldErrors: zodFieldErrors(parsed.error),
        },
        400,
      );
    }
    const result = await requestAppointmentReschedule(parsed.data);
    return publicApiResponse({
      ok: true,
      reference: result.reference,
      message: "Recibimos tu solicitud de reprogramación.",
    });
  } catch (error) {
    if (
      error instanceof RequestSecurityError ||
      error instanceof ServiceError
    ) {
      return publicApiResponse(
        { ok: false, message: error.message },
        error.status,
      );
    }
    console.error("No fue posible solicitar la reprogramación.");
    return publicApiResponse(
      { ok: false, message: "No fue posible solicitar la reprogramación." },
      500,
    );
  }
}
