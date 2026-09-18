import { getPublicSiteSettings } from "@/server/services/site-settings-service";
import { RateLimitError, enforceRateLimit } from "@/lib/security/rate-limit";
import {
  RequestSecurityError,
  ensureSameOrigin,
  isHoneypotTriggered,
  publicApiResponse,
  readPublicJson,
} from "@/lib/security/request";
import { appointmentSchema, zodFieldErrors } from "@/lib/validation";
import { createAppointment } from "@/server/services/appointment-service";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    if (!(await getPublicSiteSettings()).bookingEnabled)
      throw new RequestSecurityError(
        "La agenda no está disponible. Contacte al equipo para coordinar su consulta.",
        503,
      );
    const body = await readPublicJson(request);
    const parsed = appointmentSchema.safeParse(body);
    if (!parsed.success) {
      return publicApiResponse(
        {
          ok: false,
          message: "Revisa los campos señalados.",
          fieldErrors: zodFieldErrors(parsed.error),
        },
        400,
      );
    }
    if (isHoneypotTriggered(parsed.data.website)) {
      return publicApiResponse({
        ok: true,
        message: "Recibimos tu solicitud de cita.",
      });
    }
    await enforceRateLimit({
      request,
      scope: "public-appointment",
      limit: 5,
      windowMs: 60 * 60 * 1000,
      secondaryKey: parsed.data.email,
    });
    const result = await createAppointment(parsed.data);
    return publicApiResponse(
      {
        ok: true,
        reference: result.reference,
        message:
          "Recibimos tu solicitud. El horario quedará confirmado únicamente cuando ambas partes lo acepten.",
      },
      201,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return publicApiResponse({ ok: false, message: error.message }, 429);
    }
    if (
      error instanceof RequestSecurityError ||
      error instanceof ServiceError
    ) {
      return publicApiResponse(
        { ok: false, message: error.message },
        error.status,
      );
    }
    console.error("No fue posible crear la cita.");
    return publicApiResponse(
      {
        ok: false,
        message: "No fue posible registrar la cita. Intenta nuevamente.",
      },
      500,
    );
  }
}
