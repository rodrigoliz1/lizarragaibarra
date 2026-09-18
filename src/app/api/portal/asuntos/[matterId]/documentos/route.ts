import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  getDocumentMaxUploadBytes,
  getDocumentUploadRateLimit,
} from "@/lib/documents/config";
import { RateLimitError, enforceRateLimit } from "@/lib/security/rate-limit";
import { ensureSameOrigin, RequestSecurityError } from "@/lib/security/request";
import {
  getPrivateStorageProvider,
  validatePrivateUpload,
  type PrivateStorageProvider,
} from "@/lib/storage";
import { documentUploadMetadataSchema } from "@/lib/validation";
import { requireActor, requireMatterAccess } from "@/server/policies";
import { scanPendingDocument } from "@/server/services/document-scan-service";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = getDocumentMaxUploadBytes();
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024;

function parsedMultipartBytes(formData: FormData) {
  let total = 0;
  for (const [name, value] of formData.entries()) {
    total += Buffer.byteLength(name, "utf8");
    total +=
      typeof value === "string" ? Buffer.byteLength(value, "utf8") : value.size;
    if (total > MAX_MULTIPART_BYTES) return total;
  }
  return total;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ matterId: string }> },
) {
  let uploadedKey: string | undefined;
  let storage: PrivateStorageProvider | undefined;
  try {
    ensureSameOrigin(request);
    const { matterId } = await context.params;
    const actor = await requireActor(["LAWYER", "ADMIN"]);
    await requireMatterAccess(matterId, actor);
    const rateLimit = getDocumentUploadRateLimit();
    await enforceRateLimit({
      request,
      scope: "document-upload",
      limit: rateLimit.limit,
      windowMs: rateLimit.windowMs,
      secondaryKey: `${actor.id}:${matterId}`,
    });

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_MULTIPART_BYTES
    ) {
      return NextResponse.json(
        { ok: false, message: "El archivo supera el límite permitido." },
        { status: 413, headers: { "cache-control": "private, no-store" } },
      );
    }
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("multipart/form-data")
    ) {
      throw new RequestSecurityError(
        "El contenido debe enviarse como formulario multipart.",
        415,
      );
    }
    const formData = await request.formData();
    if (parsedMultipartBytes(formData) > MAX_MULTIPART_BYTES) {
      return NextResponse.json(
        { ok: false, message: "El archivo supera el límite permitido." },
        { status: 413, headers: { "cache-control": "private, no-store" } },
      );
    }
    const metadata = documentUploadMetadataSchema.safeParse({
      title: formData.get("title"),
      visibility: formData.get("visibility") || "CLIENT",
    });
    const file = formData.get("file");
    if (!metadata.success || !(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Revisa el título, la visibilidad y el archivo.",
          fieldErrors: metadata.success
            ? undefined
            : metadata.error.flatten().fieldErrors,
        },
        { status: 400, headers: { "cache-control": "private, no-store" } },
      );
    }
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, message: "El archivo supera el límite permitido." },
        { status: 413, headers: { "cache-control": "private, no-store" } },
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, message: "El archivo supera el límite permitido." },
        { status: 413, headers: { "cache-control": "private, no-store" } },
      );
    }
    let mimeType: ReturnType<typeof validatePrivateUpload>;
    try {
      mimeType = validatePrivateUpload({
        bytes,
        declaredMimeType: file.type,
        maximumBytes: MAX_UPLOAD_BYTES,
      });
    } catch (error) {
      throw new RequestSecurityError(
        error instanceof Error
          ? error.message
          : "El archivo no tiene un formato permitido.",
        415,
      );
    }
    const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
    storage = getPrivateStorageProvider();
    const stored = await storage.put({
      bytes,
      mimeType,
      quarantine: true,
      checksumSha256,
    });
    uploadedKey = stored.key;

    const document = await db.$transaction(async (transaction) => {
      const created = await transaction.document.create({
        data: {
          matterId,
          title: metadata.data.title,
          originalName: file.name.replace(/[\r\n\\/]/g, "_").slice(0, 180),
          storageKey: stored.key,
          mimeType: stored.mimeType,
          size: stored.size,
          visibility: metadata.data.visibility,
          scanStatus: "PENDING",
          checksumSha256,
          scanError: null,
          scannedAt: null,
          uploadedById: actor.id,
        },
        select: {
          id: true,
          title: true,
          originalName: true,
          mimeType: true,
          size: true,
          scanStatus: true,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "MATTER_DOCUMENT_UPLOADED",
          entityType: "Document",
          entityId: created.id,
          metadata: {
            matterId,
            visibility: metadata.data.visibility,
            mimeType: stored.mimeType,
            size: stored.size,
            quarantine: true,
          },
        },
      });
      return created;
    });
    uploadedKey = undefined;
    const scan = await scanPendingDocument(document.id).catch(() => ({
      status: "PENDING" as const,
      documentId: document.id,
    }));
    const scanStatus = scan.status === "SKIPPED" ? "PENDING" : scan.status;
    const responseStatus = scanStatus === "PENDING" ? 202 : 201;
    return NextResponse.json(
      {
        ok: scanStatus !== "REJECTED",
        message:
          scanStatus === "CLEAN"
            ? "Documento verificado y compartido."
            : scanStatus === "REJECTED"
              ? "El documento fue rechazado por seguridad."
              : "Documento recibido; el análisis de seguridad está pendiente.",
        data: { ...document, scanStatus },
      },
      {
        status: scanStatus === "REJECTED" ? 422 : responseStatus,
        headers: { "cache-control": "private, no-store" },
      },
    );
  } catch (error) {
    if (uploadedKey && storage) {
      await storage.delete(uploadedKey).catch(() => undefined);
    }
    const status =
      error instanceof RequestSecurityError ||
      error instanceof ServiceError ||
      error instanceof RateLimitError
        ? error.status
        : 500;
    const retryAfter =
      error instanceof RateLimitError
        ? Math.max(1, error.retryAfterSeconds).toString()
        : undefined;
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && status !== 500
            ? error.message
            : "No fue posible guardar el documento.",
      },
      {
        status,
        headers: {
          "cache-control": "private, no-store",
          ...(retryAfter ? { "retry-after": retryAfter } : {}),
        },
      },
    );
  }
}
