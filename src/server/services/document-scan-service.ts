import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import {
  getDocumentMaxUploadBytes,
  getDocumentScanBatchSize,
  getDocumentScanLockTimeoutMs,
} from "@/lib/documents/config";
import {
  getDocumentScanner,
  type DocumentScanner,
} from "@/lib/documents/scanner";
import {
  documentSha256,
  inspectDocumentBytes,
  type DocumentInspectionResult,
} from "@/lib/documents/inspection";
import {
  ALLOWED_PRIVATE_DOCUMENT_TYPES,
  getPrivateStorageProvider,
  type AllowedPrivateDocumentType,
  type PrivateStorageProvider,
} from "@/lib/storage";

const SCAN_CLAIM_PREFIX = "SCAN_IN_PROGRESS:";

type ScanDocumentResult =
  | { status: "CLEAN" | "REJECTED" | "PENDING"; documentId: string }
  | { status: "SKIPPED"; documentId: string };

export function isActiveDocumentScanClaim(
  value: string | null,
  now = Date.now(),
  timeoutMs = getDocumentScanLockTimeoutMs(),
) {
  if (!value?.startsWith(SCAN_CLAIM_PREFIX)) return false;
  const timestamp = Number(value.split(":", 3)[1]);
  return Number.isFinite(timestamp) && timestamp > now - timeoutMs;
}

function configuredScannerName() {
  const provider = process.env.FILE_SCANNER_PROVIDER?.trim().toLowerCase();
  return provider === "clamav" || provider === "mock" || provider === "disabled"
    ? provider
    : "unavailable";
}

function scanClaim(now: number) {
  return `${SCAN_CLAIM_PREFIX}${now}:${randomUUID()}`;
}

async function finalizeScan(input: {
  documentId: string;
  claim: string;
  provider: string;
  result: DocumentInspectionResult;
  storageKey?: string;
}) {
  return db.$transaction(async (transaction) => {
    const updated = await transaction.document.updateMany({
      where: {
        id: input.documentId,
        scanStatus: "PENDING",
        scanError: input.claim,
        deletedAt: null,
      },
      data: {
        scanStatus: input.result.status,
        checksumSha256: /^[a-f0-9]{64}$/.test(input.result.checksumSha256)
          ? input.result.checksumSha256
          : undefined,
        scanProvider: input.provider,
        scanError: input.result.reasonCode,
        scannedAt: input.result.status === "PENDING" ? null : new Date(),
        storageKey: input.storageKey,
      },
    });
    if (updated.count !== 1) return false;
    await transaction.auditLog.create({
      data: {
        action:
          input.result.status === "CLEAN"
            ? "DOCUMENT_SCAN_CLEAN"
            : input.result.status === "REJECTED"
              ? "DOCUMENT_SCAN_REJECTED"
              : "DOCUMENT_SCAN_DEFERRED",
        entityType: "Document",
        entityId: input.documentId,
        metadata: {
          status: input.result.status,
          provider: input.provider,
          reasonCode: input.result.reasonCode,
        },
      },
    });
    return true;
  });
}

async function deferUnavailableScan(input: {
  documentId: string;
  claim: string;
  provider: string;
  checksumSha256: string;
  reasonCode: "SCANNER_UNAVAILABLE" | "STORAGE_UNAVAILABLE";
}) {
  const finalized = await finalizeScan({
    ...input,
    result: {
      status: "PENDING",
      checksumSha256: input.checksumSha256,
      reasonCode: input.reasonCode,
    },
  });
  return {
    status: finalized ? ("PENDING" as const) : ("SKIPPED" as const),
    documentId: input.documentId,
  };
}

export async function scanPendingDocument(
  documentId: string,
  dependencies: {
    scanner?: DocumentScanner;
    storage?: PrivateStorageProvider;
    now?: Date;
  } = {},
): Promise<ScanDocumentResult> {
  const now = dependencies.now ?? new Date();
  const document = await db.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      storageKey: true,
      size: true,
      mimeType: true,
      checksumSha256: true,
      scanStatus: true,
      scanError: true,
      deletedAt: true,
    },
  });
  if (
    !document ||
    document.deletedAt ||
    document.scanStatus !== "PENDING" ||
    isActiveDocumentScanClaim(document.scanError, now.getTime())
  ) {
    return { status: "SKIPPED", documentId };
  }

  const claim = scanClaim(now.getTime());
  const claimed = await db.document.updateMany({
    where: {
      id: document.id,
      scanStatus: "PENDING",
      scanError: document.scanError,
      deletedAt: null,
    },
    data: { scanError: claim },
  });
  if (claimed.count !== 1) return { status: "SKIPPED", documentId };

  const provider = dependencies.scanner?.name ?? configuredScannerName();
  let bytes: Uint8Array;
  let storage: PrivateStorageProvider;
  try {
    storage = dependencies.storage ?? getPrivateStorageProvider();
    bytes = await storage.get(document.storageKey);
  } catch {
    return deferUnavailableScan({
      documentId,
      claim,
      provider,
      checksumSha256: document.checksumSha256 ?? "",
      reasonCode: "STORAGE_UNAVAILABLE",
    });
  }

  let scanner: DocumentScanner;
  try {
    scanner = dependencies.scanner ?? getDocumentScanner();
  } catch {
    return deferUnavailableScan({
      documentId,
      claim,
      provider,
      checksumSha256: document.checksumSha256 ?? documentSha256(bytes),
      reasonCode: "SCANNER_UNAVAILABLE",
    });
  }

  let result = await inspectDocumentBytes({
    bytes,
    expectedSize: document.size,
    expectedChecksumSha256: document.checksumSha256,
    maximumBytes: getDocumentMaxUploadBytes(),
    scanner,
  });
  const allowedMimeType = ALLOWED_PRIVATE_DOCUMENT_TYPES.includes(
    document.mimeType as AllowedPrivateDocumentType,
  )
    ? (document.mimeType as AllowedPrivateDocumentType)
    : null;
  if (result.status === "CLEAN" && !allowedMimeType) {
    result = {
      status: "REJECTED",
      checksumSha256: result.checksumSha256,
      reasonCode: "INVALID_SCAN_INPUT",
    };
  }
  let promotedStorageKey: string | undefined;
  if (
    result.status === "CLEAN" &&
    document.storageKey.startsWith("quarantine/")
  ) {
    try {
      const promoted = await storage.put({
        bytes,
        mimeType: allowedMimeType!,
        checksumSha256: result.checksumSha256,
      });
      promotedStorageKey = promoted.key;
    } catch {
      return deferUnavailableScan({
        documentId,
        claim,
        provider: scanner.name,
        checksumSha256: result.checksumSha256,
        reasonCode: "STORAGE_UNAVAILABLE",
      });
    }
  }

  let finalized: boolean;
  try {
    finalized = await finalizeScan({
      documentId,
      claim,
      provider: scanner.name,
      result,
      storageKey: promotedStorageKey,
    });
  } catch (error) {
    if (promotedStorageKey) {
      await storage.delete(promotedStorageKey).catch(() => undefined);
    }
    throw error;
  }
  if (promotedStorageKey) {
    if (finalized) {
      await storage.delete(document.storageKey).catch(() => undefined);
    } else {
      await storage.delete(promotedStorageKey).catch(() => undefined);
    }
  }
  return {
    status: finalized ? result.status : "SKIPPED",
    documentId,
  };
}

export async function processPendingDocumentScans(batchSize?: number) {
  const pending = await db.document.findMany({
    where: { scanStatus: "PENDING", deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(50, batchSize ?? getDocumentScanBatchSize())),
  });
  const settled = await Promise.allSettled(
    pending.map(({ id }) => scanPendingDocument(id)),
  );
  const results = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  return {
    processed: pending.length,
    clean: results.filter((result) => result.status === "CLEAN").length,
    rejected: results.filter((result) => result.status === "REJECTED").length,
    pending: results.filter((result) => result.status === "PENDING").length,
    skipped: results.filter((result) => result.status === "SKIPPED").length,
    failed: settled.filter((result) => result.status === "rejected").length,
  };
}
