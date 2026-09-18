import { createHash } from "node:crypto";

import {
  DocumentScannerInputError,
  type DocumentScanner,
} from "@/lib/documents/scanner";

export type DocumentInspectionResult =
  | {
      status: "CLEAN";
      checksumSha256: string;
      reasonCode: null;
    }
  | {
      status: "REJECTED";
      checksumSha256: string;
      reasonCode:
        "CHECKSUM_MISMATCH" | "INVALID_SCAN_INPUT" | "MALWARE_DETECTED";
    }
  | {
      status: "PENDING";
      checksumSha256: string;
      reasonCode: "SCANNER_UNAVAILABLE" | "STORAGE_UNAVAILABLE";
    };

export function documentSha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function inspectDocumentBytes(input: {
  bytes: Uint8Array;
  expectedSize: number;
  expectedChecksumSha256?: string | null;
  maximumBytes: number;
  scanner: DocumentScanner;
}): Promise<DocumentInspectionResult> {
  const checksumSha256 = documentSha256(input.bytes);
  if (
    input.bytes.byteLength === 0 ||
    input.bytes.byteLength !== input.expectedSize ||
    input.bytes.byteLength > input.maximumBytes
  ) {
    return {
      status: "REJECTED",
      checksumSha256,
      reasonCode: "INVALID_SCAN_INPUT",
    };
  }
  if (
    input.expectedChecksumSha256 &&
    checksumSha256 !== input.expectedChecksumSha256
  ) {
    return {
      status: "REJECTED",
      checksumSha256,
      reasonCode: "CHECKSUM_MISMATCH",
    };
  }

  try {
    const result = await input.scanner.scan(input.bytes);
    return result.verdict === "clean"
      ? { status: "CLEAN", checksumSha256, reasonCode: null }
      : {
          status: "REJECTED",
          checksumSha256,
          reasonCode: "MALWARE_DETECTED",
        };
  } catch (error) {
    return error instanceof DocumentScannerInputError
      ? {
          status: "REJECTED",
          checksumSha256,
          reasonCode: "INVALID_SCAN_INPUT",
        }
      : {
          status: "PENDING",
          checksumSha256,
          reasonCode: "SCANNER_UNAVAILABLE",
        };
  }
}
