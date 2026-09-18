import { describe, expect, it } from "vitest";

import {
  getDocumentDownloadRateLimit,
  getDocumentDownloadTtlSeconds,
  getDocumentMaxUploadBytes,
  getDocumentScanBatchSize,
  getDocumentUploadRateLimit,
} from "@/lib/documents/config";

describe("configuración de documentos privados", () => {
  it("aplica valores seguros por defecto", () => {
    expect(getDocumentMaxUploadBytes({})).toBe(10 * 1024 * 1024);
    expect(getDocumentDownloadTtlSeconds({})).toBe(300);
    expect(getDocumentScanBatchSize({})).toBe(10);
    expect(getDocumentUploadRateLimit({})).toEqual({
      limit: 10,
      windowMs: 60_000,
    });
    expect(getDocumentDownloadRateLimit({})).toEqual({
      limit: 120,
      windowMs: 60_000,
    });
  });

  it("acota valores manipulados o excesivos", () => {
    expect(
      getDocumentMaxUploadBytes({ DOCUMENT_MAX_UPLOAD_BYTES: "999999999" }),
    ).toBe(50 * 1024 * 1024);
    expect(
      getDocumentDownloadTtlSeconds({
        DOCUMENT_DOWNLOAD_URL_TTL_SECONDS: "99999",
      }),
    ).toBe(900);
    expect(
      getDocumentUploadRateLimit({
        DOCUMENT_UPLOAD_RATE_LIMIT_MAX: "0",
        DOCUMENT_UPLOAD_RATE_LIMIT_WINDOW_MS: "not-a-number",
      }),
    ).toEqual({ limit: 1, windowMs: 60_000 });
  });
});
