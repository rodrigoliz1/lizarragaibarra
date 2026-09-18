import { getPublicSiteSettings } from "@/server/services/site-settings-service";
import { RateLimitError, enforceRateLimit } from "@/lib/security/rate-limit";
import {
  RequestSecurityError,
  ensureSameOrigin,
  isHoneypotTriggered,
  publicApiResponse,
  readPublicJson,
} from "@/lib/security/request";
import { contactSchema, zodFieldErrors } from "@/lib/validation";
import { createContactSubmission } from "@/server/services/contact-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    if (!(await getPublicSiteSettings()).contactEnabled)
      throw new RequestSecurityError(
        "El formulario de contacto no está disponible. Comuníquese directamente con el equipo.",
        503,
      );
    const body = await readPublicJson(request);
    const parsed = contactSchema.safeParse(body);
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
      return publicApiResponse({ ok: true, message: "Recibimos tu mensaje." });
    }
    await enforceRateLimit({
      request,
      scope: "public-contact",
      limit: 5,
      windowMs: 60 * 60 * 1000,
      secondaryKey: parsed.data.email,
    });
    const result = await createContactSubmission(parsed.data);
    return publicApiResponse(
      {
        ok: true,
        reference: result.reference,
        message:
          "Recibimos tu mensaje. Conserva la referencia para cualquier seguimiento.",
      },
      201,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return publicApiResponse({ ok: false, message: error.message }, 429);
    }
    if (error instanceof RequestSecurityError) {
      return publicApiResponse(
        { ok: false, message: error.message },
        error.status,
      );
    }
    console.error("No fue posible registrar el contacto.");
    return publicApiResponse(
      {
        ok: false,
        message: "No fue posible enviar el mensaje. Intenta nuevamente.",
      },
      500,
    );
  }
}
