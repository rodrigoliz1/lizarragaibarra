import {
  getDocumentMaxUploadBytes,
  getDocumentScanTimeoutMs,
} from "@/lib/documents/config";
import { ClamAvDocumentScanner } from "@/lib/documents/scanner/clamav";
import { MockDocumentScanner } from "@/lib/documents/scanner/mock";
import { isLocalDevelopment, isVercelPreview } from "@/lib/environment";
import type { RuntimeEnvironment } from "@/lib/environment";

export * from "./types";
export * from "./clamav";

export function isMockDocumentScannerAllowed(
  environment: RuntimeEnvironment = process.env,
) {
  return isLocalDevelopment(environment) || isVercelPreview(environment);
}

export function getDocumentScanner(
  environment: RuntimeEnvironment = process.env,
) {
  const provider =
    environment.FILE_SCANNER_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") {
    if (!isMockDocumentScannerAllowed(environment)) {
      throw new Error(
        "FILE_SCANNER_PROVIDER=mock no está permitido en producción.",
      );
    }
    return new MockDocumentScanner();
  }
  if (provider !== "clamav") {
    throw new Error(`Proveedor de análisis no soportado: ${provider}`);
  }

  const host = environment.CLAMAV_HOST?.trim();
  const port = Number(environment.CLAMAV_PORT);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("La configuración de ClamAV está incompleta.");
  }
  return new ClamAvDocumentScanner({
    host,
    port,
    timeoutMs: getDocumentScanTimeoutMs(environment),
    maximumBytes: getDocumentMaxUploadBytes(environment),
  });
}
