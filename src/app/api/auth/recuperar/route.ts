import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import {
  ensureSameOrigin,
  publicApiResponse,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { passwordResetRequestSchema, zodFieldErrors } from "@/lib/validation";
import { requestPasswordReset } from "@/server/services/password-reset-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const parsed = passwordResetRequestSchema.safeParse(
      await readPublicJson(request),
    );
    if (!parsed.success) {
      return publicApiResponse(
        {
          ok: false,
          message: "Revisa el correo ingresado.",
          fieldErrors: zodFieldErrors(parsed.error),
        },
        400,
      );
    }
    await enforceRateLimit({
      request,
      scope: "password-reset-request",
      limit: 3,
      windowMs: 60 * 60 * 1000,
      secondaryKey: parsed.data.email,
    });
    await requestPasswordReset(parsed.data.email);
    return publicApiResponse({
      ok: true,
      message:
        "Si existe una cuenta activa, enviaremos instrucciones al correo registrado.",
    });
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
    console.error("No fue posible procesar la recuperación de acceso.");
    return publicApiResponse(
      {
        ok: true,
        message:
          "Si existe una cuenta activa, enviaremos instrucciones al correo registrado.",
      },
      200,
    );
  }
}
