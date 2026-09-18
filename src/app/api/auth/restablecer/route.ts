import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import {
  ensureSameOrigin,
  publicApiResponse,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { passwordResetSchema, zodFieldErrors } from "@/lib/validation";
import { ServiceError } from "@/server/services/errors";
import { resetPassword } from "@/server/services/password-reset-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const parsed = passwordResetSchema.safeParse(await readPublicJson(request));
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
    await enforceRateLimit({
      request,
      scope: "password-reset-complete",
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    await resetPassword(parsed.data.token, parsed.data.password);
    return publicApiResponse({
      ok: true,
      message: "La contraseña fue actualizada. Ya puedes iniciar sesión.",
    });
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
    console.error("No fue posible restablecer la contraseña.");
    return publicApiResponse(
      { ok: false, message: "No fue posible actualizar la contraseña." },
      500,
    );
  }
}
