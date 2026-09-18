import { z } from "zod";

import type { RuntimeEnvironment } from "@/lib/site-url";

export type { RuntimeEnvironment } from "@/lib/site-url";

const enabledValue = z.enum(["true", "false"]).default("false");
const emailProviderSchema = z.enum(["mock", "brevo", "resend"]);

const brevoEnvironmentSchema = z.object({
  BREVO_API_KEY: z.string().trim().min(1, "BREVO_API_KEY es obligatoria."),
  EMAIL_FROM_ADDRESS: z
    .string()
    .trim()
    .email("EMAIL_FROM_ADDRESS debe ser un correo válido."),
  EMAIL_FROM_NAME: z
    .string()
    .trim()
    .min(1, "EMAIL_FROM_NAME es obligatorio.")
    .max(70),
  EMAIL_REPLY_TO: z.string().trim().email().optional().or(z.literal("")),
  BREVO_SANDBOX_MODE: enabledValue,
});

function value(environment: RuntimeEnvironment, key: string) {
  const candidate = environment[key]?.trim();
  return candidate || undefined;
}

export function isVercelPreview(environment: RuntimeEnvironment = process.env) {
  return value(environment, "VERCEL_ENV") === "preview";
}

export function isVercelProduction(
  environment: RuntimeEnvironment = process.env,
) {
  return value(environment, "VERCEL_ENV") === "production";
}

export function isLocalDevelopment(
  environment: RuntimeEnvironment = process.env,
) {
  return (
    !value(environment, "VERCEL_ENV") &&
    value(environment, "NODE_ENV") !== "production"
  );
}

export function isPublicProduction(
  environment: RuntimeEnvironment = process.env,
) {
  if (isVercelProduction(environment)) return true;
  if (isVercelPreview(environment)) return false;
  return value(environment, "NODE_ENV") === "production";
}

function isFinalDomain(environment: RuntimeEnvironment) {
  const configured =
    value(environment, "NEXT_PUBLIC_SITE_URL") ||
    value(environment, "AUTH_URL") ||
    value(environment, "NEXTAUTH_URL");
  if (!configured) return false;
  try {
    return new URL(configured).hostname.toLowerCase() === "lizarragaibarra.com";
  } catch {
    return false;
  }
}

export function isDemoAuthAllowed(
  environment: RuntimeEnvironment = process.env,
) {
  if (value(environment, "ENABLE_DEMO_AUTH") !== "true") return false;
  if (isPublicProduction(environment) || isFinalDomain(environment)) {
    return false;
  }
  return isLocalDevelopment(environment) || isVercelPreview(environment);
}

export function isMockCalendarAllowed(
  environment: RuntimeEnvironment = process.env,
) {
  if (isVercelProduction(environment)) return false;
  return isLocalDevelopment(environment) || isVercelPreview(environment);
}

export function isMockEmailAllowed(
  environment: RuntimeEnvironment = process.env,
) {
  if (isVercelProduction(environment)) return false;
  return isLocalDevelopment(environment) || isVercelPreview(environment);
}

export function getEmailProviderName(
  environment: RuntimeEnvironment = process.env,
) {
  const provider =
    value(environment, "EMAIL_PROVIDER")?.toLowerCase() || "mock";
  const parsed = emailProviderSchema.safeParse(provider);
  if (!parsed.success) {
    throw new Error(`Proveedor de correo no soportado: ${provider}`);
  }
  return parsed.data;
}

export function getBrevoConfiguration(
  environment: RuntimeEnvironment = process.env,
) {
  const parsed = brevoEnvironmentSchema.safeParse({
    BREVO_API_KEY: value(environment, "BREVO_API_KEY"),
    EMAIL_FROM_ADDRESS: value(environment, "EMAIL_FROM_ADDRESS"),
    EMAIL_FROM_NAME: value(environment, "EMAIL_FROM_NAME"),
    EMAIL_REPLY_TO: value(environment, "EMAIL_REPLY_TO") || "",
    BREVO_SANDBOX_MODE: value(environment, "BREVO_SANDBOX_MODE") || "false",
  });
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path[0])
      .join(", ");
    throw new Error(`La configuración de Brevo está incompleta: ${missing}.`);
  }
  return {
    apiKey: parsed.data.BREVO_API_KEY,
    fromAddress: parsed.data.EMAIL_FROM_ADDRESS,
    fromName: parsed.data.EMAIL_FROM_NAME,
    replyTo: parsed.data.EMAIL_REPLY_TO || undefined,
    sandboxMode: parsed.data.BREVO_SANDBOX_MODE === "true",
  };
}
