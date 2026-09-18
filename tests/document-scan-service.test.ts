import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DocumentScanner } from "@/lib/documents/scanner";
import { DocumentScannerUnavailableError } from "@/lib/documents/scanner";
import type { PrivateStorageProvider } from "@/lib/storage/types";

const database = vi.hoisted(() => ({
  findUnique: vi.fn(),
  claim: vi.fn(),
  finalize: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    document: {
      findUnique: database.findUnique,
      updateMany: database.claim,
      findMany: vi.fn(),
    },
    $transaction: database.transaction,
  },
}));

vi.mock("@/lib/storage", () => ({
  getPrivateStorageProvider: vi.fn(),
  ALLOWED_PRIVATE_DOCUMENT_TYPES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ],
}));

import {
  isActiveDocumentScanClaim,
  scanPendingDocument,
} from "@/server/services/document-scan-service";

const bytes = new TextEncoder().encode("%PDF-1.7 documento privado");
const checksumSha256 = createHash("sha256").update(bytes).digest("hex");

function pendingDocument() {
  return {
    id: "doc-1",
    storageKey: "quarantine/ab/abcdefabcdefabcdefabcdefabcdefab",
    size: bytes.byteLength,
    mimeType: "application/pdf",
    checksumSha256,
    scanStatus: "PENDING",
    scanError: null,
    deletedAt: null,
  };
}

function storage(): PrivateStorageProvider {
  return {
    name: "local",
    get: vi.fn(async () => bytes),
    put: vi.fn(async (input) => ({
      key: "cd/cdefcdefcdefcdefcdefcdefcdefcdef",
      size: input.bytes.byteLength,
      mimeType: input.mimeType,
    })),
    delete: vi.fn(async () => undefined),
    createSignedDownloadUrl: vi.fn(async () => null),
  };
}

function scanner(scan: DocumentScanner["scan"]): DocumentScanner {
  return { name: "clamav", scan };
}

describe("orquestación de cuarentena documental", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.findUnique.mockResolvedValue(pendingDocument());
    database.claim.mockResolvedValue({ count: 1 });
    database.finalize.mockResolvedValue({ count: 1 });
    database.audit.mockResolvedValue({ id: "audit-1" });
    database.transaction.mockImplementation(async (callback) =>
      callback({
        document: { updateMany: database.finalize },
        auditLog: { create: database.audit },
      }),
    );
  });

  it("promueve fuera de cuarentena sólo tras un veredicto limpio", async () => {
    const privateStorage = storage();
    const result = await scanPendingDocument("doc-1", {
      storage: privateStorage,
      scanner: scanner(async () => ({ verdict: "clean" })),
    });

    expect(result.status).toBe("CLEAN");
    expect(privateStorage.put).toHaveBeenCalledWith(
      expect.objectContaining({
        checksumSha256,
      }),
    );
    expect(database.finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scanStatus: "CLEAN",
          storageKey: "cd/cdefcdefcdefcdefcdefcdefcdefcdef",
        }),
      }),
    );
    expect(privateStorage.delete).toHaveBeenCalledWith(
      pendingDocument().storageKey,
    );
  });

  it("conserva malware en cuarentena y lo marca REJECTED", async () => {
    const privateStorage = storage();
    const result = await scanPendingDocument("doc-1", {
      storage: privateStorage,
      scanner: scanner(async () => ({ verdict: "infected" })),
    });

    expect(result.status).toBe("REJECTED");
    expect(privateStorage.put).not.toHaveBeenCalled();
    expect(database.finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scanStatus: "REJECTED",
          scanError: "MALWARE_DETECTED",
        }),
      }),
    );
  });

  it("mantiene PENDING con error seguro cuando ClamAV no responde", async () => {
    const privateStorage = storage();
    const result = await scanPendingDocument("doc-1", {
      storage: privateStorage,
      scanner: scanner(async () => {
        throw new DocumentScannerUnavailableError();
      }),
    });

    expect(result.status).toBe("PENDING");
    expect(privateStorage.put).not.toHaveBeenCalled();
    expect(database.finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scanStatus: "PENDING",
          scanError: "SCANNER_UNAVAILABLE",
          scannedAt: null,
        }),
      }),
    );
  });

  it("respeta un claim reciente y permite recuperar uno vencido", () => {
    const now = Date.now();
    expect(
      isActiveDocumentScanClaim(
        `SCAN_IN_PROGRESS:${now - 1_000}:worker`,
        now,
        5_000,
      ),
    ).toBe(true);
    expect(
      isActiveDocumentScanClaim(
        `SCAN_IN_PROGRESS:${now - 6_000}:worker`,
        now,
        5_000,
      ),
    ).toBe(false);
  });
});
