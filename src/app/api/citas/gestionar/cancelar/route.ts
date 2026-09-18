import {
  ensureSameOrigin,
  publicApiResponse,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import {
  appointmentCancellationSchema,
  zodFieldErrors,
} from "@/lib/validation";
import { cancelAppointment } from "@/server/services/appointment-management-service";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const parsed = appointmentCancellationSchema.safeParse(
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
    const result = await cancelAppointment(parsed.data);
    return publicApiResponse({
      ok: true,
      reference: result.reference,
      message: "La cita fue cancelada.",
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
    console.error("No fue posible cancelar la cita.");
    return publicApiResponse(
      { ok: false, message: "No fue posible cancelar la cita." },
      500,
    );
  }
}
