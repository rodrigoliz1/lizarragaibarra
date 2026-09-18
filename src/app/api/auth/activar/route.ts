import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import {
  ensureSameOrigin,
  publicApiResponse,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { activationSchema, zodFieldErrors } from "@/lib/validation";
import { activateAccount } from "@/server/services/account-service";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const parsed = activationSchema.safeParse(await readPublicJson(request));
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
      scope: "account-activation",
      limit: 6,
      windowMs: 60 * 60 * 1000,
    });
    await activateAccount(parsed.data.token, parsed.data.password);
    return publicApiResponse({
      ok: true,
      message: "Tu cuenta quedó activada. Ya puedes iniciar sesión.",
    });
  } catch (error) {
    const status =
      error instanceof RateLimitError
        ? 429
        : error instanceof RequestSecurityError || error instanceof ServiceError
          ? error.status
          : 500;
    return publicApiResponse(
      {
        ok: false,
        message:
          error instanceof Error && status !== 500
            ? error.message
            : "No fue posible activar la cuenta.",
      },
      status,
    );
  }
}
