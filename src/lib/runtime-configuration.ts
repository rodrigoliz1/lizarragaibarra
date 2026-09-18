import { z } from "zod";

type RuntimeEnvironment = Record<string, string | undefined>;

const optionalDeploymentStage = z.preprocess(
  (candidate) =>
    typeof candidate === "string" && candidate.trim() === ""
      ? undefined
      : candidate,
  z.enum(["development", "preview", "production"]).optional(),
);

const baseSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  VERCEL_ENV: optionalDeploymentStage,
  EMAIL_PROVIDER: z.enum(["mock", "brevo", "resend"]).default("mock"),
  CALENDAR_PROVIDER: z.enum(["mock", "google", "internal"]).default("internal"),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  FILE_SCANNER_PROVIDER: z.enum(["mock", "clamav"]).default("mock"),
  RATE_LIMIT_PROVIDER: z.enum(["memory", "database"]).default("memory"),
});

function configured(environment: RuntimeEnvironment, key: string) {
  return Boolean(environment[key]?.trim());
}

function isValidUrl(value: string | undefined, protocols: string[]) {
  if (!value) return false;
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export type RuntimeConfigurationReport = {
  valid: boolean;
  stage: "development" | "test" | "preview" | "production";
  missing: string[];
  invalid: string[];
  warnings: string[];
};

export function validateRuntimeConfiguration(
  environment: RuntimeEnvironment = process.env,
): RuntimeConfigurationReport {
  const parsed = baseSchema.safeParse(environment);
  const invalid = parsed.success
    ? []
    : parsed.error.issues.map((issue) => String(issue.path[0]));
  const stage =
    environment.VERCEL_ENV === "production" ||
    (environment.NODE_ENV === "production" && !environment.VERCEL_ENV)
      ? "production"
      : environment.VERCEL_ENV === "preview"
        ? "preview"
        : environment.NODE_ENV === "test"
          ? "test"
          : "development";
  const deployed = stage === "preview" || stage === "production";
  const missing = new Set<string>();
  const warnings = new Set<string>();
  const require = (...keys: string[]) => {
    for (const key of keys) if (!configured(environment, key)) missing.add(key);
  };

  if (deployed) {
    require("AUTH_SECRET", "DATABASE_URL", "DIRECT_URL", "DATA_ENCRYPTION_KEY_CURRENT", "MFA_RECOVERY_CODE_PEPPER", "RATE_LIMIT_SALT");
    if ((environment.AUTH_SECRET?.trim().length ?? 0) < 32) {
      invalid.push("AUTH_SECRET");
    }
    if (!isValidUrl(environment.DATABASE_URL, ["postgres:", "postgresql:"])) {
      invalid.push("DATABASE_URL");
    }
    if (!isValidUrl(environment.DIRECT_URL, ["postgres:", "postgresql:"])) {
      invalid.push("DIRECT_URL");
    }
  }

  const emailProvider = environment.EMAIL_PROVIDER?.trim() || "mock";
  if (emailProvider === "brevo") {
    require("BREVO_API_KEY", "EMAIL_FROM_ADDRESS", "EMAIL_FROM_NAME", "CONTACT_RECIPIENT_EMAIL");
    if (deployed) require("EMAIL_CRON_SECRET");
  } else if (emailProvider === "resend") {
    require("RESEND_API_KEY", "EMAIL_FROM");
    if (deployed) require("EMAIL_CRON_SECRET");
  } else if (stage === "production") {
    invalid.push("EMAIL_PROVIDER");
  }

  const calendarProvider = environment.CALENDAR_PROVIDER?.trim() || "internal";
  if (calendarProvider === "google") {
    require("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GOOGLE_CALENDAR_ID");
    if (deployed) require("CALENDAR_SYNC_CRON_SECRET");
  } else if (stage === "production" && calendarProvider !== "internal") {
    invalid.push("CALENDAR_PROVIDER");
  }

  const storageProvider = environment.STORAGE_PROVIDER?.trim() || "local";
  if (storageProvider === "s3") {
    require("S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_MEDIA_BUCKET");
    if (
      environment.S3_PUBLIC_MEDIA_BUCKET &&
      environment.S3_PUBLIC_MEDIA_BUCKET === environment.S3_BUCKET
    )
      invalid.push("S3_PUBLIC_MEDIA_BUCKET");
    if (deployed && !isValidUrl(environment.S3_ENDPOINT, ["https:"])) {
      invalid.push("S3_ENDPOINT");
    }
    const s3Encryption =
      environment.S3_SERVER_SIDE_ENCRYPTION?.trim() || "AES256";
    if (!(["AES256", "aws:kms"] as string[]).includes(s3Encryption)) {
      invalid.push("S3_SERVER_SIDE_ENCRYPTION");
    } else if (s3Encryption === "aws:kms") {
      require("S3_KMS_KEY_ID");
    }
  } else if (deployed) {
    invalid.push("STORAGE_PROVIDER");
  }

  const scanner = environment.FILE_SCANNER_PROVIDER?.trim() || "mock";
  const scannerProduction =
    stage === "production" ||
    (environment.NODE_ENV === "production" &&
      environment.VERCEL_ENV !== "preview");
  if (scanner === "clamav") {
    require("CLAMAV_HOST", "CLAMAV_PORT");
    const clamAvPort = Number(environment.CLAMAV_PORT);
    if (
      configured(environment, "CLAMAV_PORT") &&
      (!Number.isInteger(clamAvPort) || clamAvPort < 1 || clamAvPort > 65_535)
    ) {
      invalid.push("CLAMAV_PORT");
    }
    if (scannerProduction) require("FILE_SCAN_CRON_SECRET");
  } else if (scannerProduction) {
    invalid.push("FILE_SCANNER_PROVIDER");
  }
  const rateLimit = environment.RATE_LIMIT_PROVIDER?.trim() || "memory";
  if (deployed && rateLimit !== "database") {
    invalid.push("RATE_LIMIT_PROVIDER");
  }

  if (configured(environment, "S3_PUBLIC_BASE_URL")) {
    warnings.add(
      "S3_PUBLIC_BASE_URL no debe usarse para expedientes privados.",
    );
  }
  for (const cronSecret of [
    "EMAIL_CRON_SECRET",
    "CALENDAR_SYNC_CRON_SECRET",
    "FILE_SCAN_CRON_SECRET",
    "HEALTHCHECK_SECRET",
  ]) {
    if (
      configured(environment, cronSecret) &&
      (environment[cronSecret]?.trim().length ?? 0) < 24
    ) {
      invalid.push(cronSecret);
    }
  }
  const maxAge = Number(environment.SESSION_MAX_AGE_SECONDS || 28_800);
  const idle = Number(environment.SESSION_IDLE_TIMEOUT_SECONDS || 3_600);
  if (!Number.isFinite(maxAge) || maxAge < 900 || maxAge > 86_400) {
    invalid.push("SESSION_MAX_AGE_SECONDS");
  }
  if (!Number.isFinite(idle) || idle < 300 || idle > maxAge) {
    invalid.push("SESSION_IDLE_TIMEOUT_SECONDS");
  }
  for (const key of Object.keys(environment)) {
    if (
      key.startsWith("NEXT_PUBLIC_") &&
      /(SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)/i.test(key)
    ) {
      invalid.push(key);
    }
  }

  const uniqueInvalid = [...new Set(invalid)].sort();
  return {
    valid: missing.size === 0 && uniqueInvalid.length === 0,
    stage,
    missing: [...missing].sort(),
    invalid: uniqueInvalid,
    warnings: [...warnings],
  };
}

export function assertRuntimeConfiguration(
  environment: RuntimeEnvironment = process.env,
) {
  const report = validateRuntimeConfiguration(environment);
  if (!report.valid) {
    const names = [...report.missing, ...report.invalid].join(", ");
    throw new Error(
      `Configuración de runtime incompleta o inválida: ${names}.`,
    );
  }
  return report;
}
