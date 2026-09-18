import { describe, expect, it } from "vitest";

import { validateRuntimeConfiguration } from "@/lib/runtime-configuration";

describe("configuración centralizada", () => {
  it("permite mocks en desarrollo", () => {
    expect(
      validateRuntimeConfiguration({
        NODE_ENV: "development",
        EMAIL_PROVIDER: "mock",
        CALENDAR_PROVIDER: "mock",
        STORAGE_PROVIDER: "local",
        FILE_SCANNER_PROVIDER: "mock",
        RATE_LIMIT_PROVIDER: "memory",
      }).valid,
    ).toBe(true);
  });

  it("trata VERCEL_ENV vacío como desarrollo local", () => {
    const report = validateRuntimeConfiguration({
      NODE_ENV: "development",
      VERCEL_ENV: "",
      EMAIL_PROVIDER: "mock",
      CALENDAR_PROVIDER: "mock",
      STORAGE_PROVIDER: "local",
      FILE_SCANNER_PROVIDER: "mock",
      RATE_LIMIT_PROVIDER: "memory",
    });
    expect(report.valid).toBe(true);
    expect(report.stage).toBe("development");
  });

  it("mantiene Resend disponible cuando su configuración está completa", () => {
    const report = validateRuntimeConfiguration({
      NODE_ENV: "development",
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "test-key",
      EMAIL_FROM: "LIZÁRRAGA & IBARRA ABOGADOS <notificaciones@example.test>",
    });
    expect(report.valid).toBe(true);
  });

  it("falla cerrado con mocks y secretos ausentes en producción", () => {
    const report = validateRuntimeConfiguration({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      EMAIL_PROVIDER: "mock",
      CALENDAR_PROVIDER: "mock",
      STORAGE_PROVIDER: "local",
      FILE_SCANNER_PROVIDER: "mock",
      RATE_LIMIT_PROVIDER: "memory",
    });
    expect(report.valid).toBe(false);
    expect(report.missing).toContain("AUTH_SECRET");
    expect(report.invalid).toEqual(
      expect.arrayContaining([
        "EMAIL_PROVIDER",
        "CALENDAR_PROVIDER",
        "STORAGE_PROVIDER",
        "FILE_SCANNER_PROVIDER",
        "RATE_LIMIT_PROVIDER",
      ]),
    );
  });

  it("rechaza nombres públicos con apariencia de secreto", () => {
    const report = validateRuntimeConfiguration({
      NODE_ENV: "development",
      NEXT_PUBLIC_API_SECRET: "never",
    });
    expect(report.invalid).toContain("NEXT_PUBLIC_API_SECRET");
  });

  it("exige ClamAV también en producción fuera de Vercel", () => {
    const report = validateRuntimeConfiguration({
      NODE_ENV: "production",
      FILE_SCANNER_PROVIDER: "mock",
    });
    expect(report.invalid).toContain("FILE_SCANNER_PROVIDER");
  });

  it("permite deshabilitar el análisis sin aprobar documentos en producción", () => {
    const report = validateRuntimeConfiguration({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      FILE_SCANNER_PROVIDER: "disabled",
      RATE_LIMIT_PROVIDER: "database",
    });

    expect(report.invalid).not.toContain("FILE_SCANNER_PROVIDER");
    expect(report.missing).not.toEqual(
      expect.arrayContaining([
        "CLAMAV_HOST",
        "CLAMAV_PORT",
        "FILE_SCAN_CRON_SECRET",
      ]),
    );
  });

  it("exige un secreto de cron robusto para reintentos de análisis", () => {
    const report = validateRuntimeConfiguration({
      NODE_ENV: "production",
      FILE_SCANNER_PROVIDER: "clamav",
      CLAMAV_HOST: "scanner.internal",
      CLAMAV_PORT: "3310",
    });
    expect(report.missing).toContain("FILE_SCAN_CRON_SECRET");
  });

  it("exige una clave cuando el almacenamiento documental usa SSE-KMS", () => {
    const report = validateRuntimeConfiguration({
      NODE_ENV: "development",
      STORAGE_PROVIDER: "s3",
      S3_ENDPOINT: "https://storage.example.com",
      S3_REGION: "us-east-1",
      S3_BUCKET: "private",
      S3_ACCESS_KEY_ID: "access",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_SERVER_SIDE_ENCRYPTION: "aws:kms",
    });
    expect(report.missing).toContain("S3_KMS_KEY_ID");
  });
});
