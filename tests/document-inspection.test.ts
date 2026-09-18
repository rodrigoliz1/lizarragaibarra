import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { inspectDocumentBytes } from "@/lib/documents/inspection";
import {
  DocumentScannerUnavailableError,
  type DocumentScanner,
} from "@/lib/documents/scanner";

const bytes = new TextEncoder().encode("contenido legal privado");
const checksum = createHash("sha256").update(bytes).digest("hex");

function scanner(implementation: DocumentScanner["scan"]): DocumentScanner {
  return { name: "clamav", scan: implementation };
}

describe("decisión de análisis documental", () => {
  it("marca CLEAN sólo después de un resultado limpio", async () => {
    const result = await inspectDocumentBytes({
      bytes,
      expectedSize: bytes.byteLength,
      expectedChecksumSha256: checksum,
      maximumBytes: 1024,
      scanner: scanner(async () => ({ verdict: "clean" })),
    });
    expect(result).toEqual({
      status: "CLEAN",
      checksumSha256: checksum,
      reasonCode: null,
    });
  });

  it("rechaza malware confirmado", async () => {
    const result = await inspectDocumentBytes({
      bytes,
      expectedSize: bytes.byteLength,
      expectedChecksumSha256: checksum,
      maximumBytes: 1024,
      scanner: scanner(async () => ({
        verdict: "infected",
        threat: "Test-Signature",
      })),
    });
    expect(result.status).toBe("REJECTED");
    expect(result.reasonCode).toBe("MALWARE_DETECTED");
  });

  it("mantiene PENDING si el scanner no está disponible", async () => {
    const result = await inspectDocumentBytes({
      bytes,
      expectedSize: bytes.byteLength,
      expectedChecksumSha256: checksum,
      maximumBytes: 1024,
      scanner: scanner(async () => {
        throw new DocumentScannerUnavailableError();
      }),
    });
    expect(result.status).toBe("PENDING");
    expect(result.reasonCode).toBe("SCANNER_UNAVAILABLE");
  });

  it("rechaza alteraciones de checksum sin invocar el antivirus", async () => {
    const scan = vi.fn<DocumentScanner["scan"]>();
    const result = await inspectDocumentBytes({
      bytes,
      expectedSize: bytes.byteLength,
      expectedChecksumSha256: "0".repeat(64),
      maximumBytes: 1024,
      scanner: scanner(scan),
    });
    expect(result.status).toBe("REJECTED");
    expect(result.reasonCode).toBe("CHECKSUM_MISMATCH");
    expect(scan).not.toHaveBeenCalled();
  });

  it("rechaza discrepancias de tamaño antes del scanner", async () => {
    const scan = vi.fn<DocumentScanner["scan"]>();
    const result = await inspectDocumentBytes({
      bytes,
      expectedSize: bytes.byteLength + 1,
      expectedChecksumSha256: checksum,
      maximumBytes: 1024,
      scanner: scanner(scan),
    });
    expect(result.status).toBe("REJECTED");
    expect(result.reasonCode).toBe("INVALID_SCAN_INPUT");
    expect(scan).not.toHaveBeenCalled();
  });
});
