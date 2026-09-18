import { Visibility } from "@prisma/client";

import { db } from "@/lib/db";
import {
  getDocumentDownloadRateLimit,
  getDocumentDownloadTtlSeconds,
} from "@/lib/documents/config";
import { RateLimitError, enforceRateLimit } from "@/lib/security/rate-limit";
import { getPrivateStorageProvider } from "@/lib/storage";
import {
  canSeeInternalContent,
  requireActor,
  requireMatterAccess,
} from "@/server/policies";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDownloadName(name: string) {
  const safe = name
    .normalize("NFKC")
    .replace(/[^\x20-\x7e]|["\\/]/g, "_")
    .trim()
    .slice(0, 180);
  return safe || "documento";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ matterId: string; documentId: string }> },
) {
  try {
    const [{ matterId, documentId }, actor] = await Promise.all([
      context.params,
      requireActor(),
    ]);
    await requireMatterAccess(matterId, actor);
    const rateLimit = getDocumentDownloadRateLimit();
    await enforceRateLimit({
      request,
      scope: "document-download",
      limit: rateLimit.limit,
      windowMs: rateLimit.windowMs,
      secondaryKey: `${actor.id}:${matterId}`,
    });
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        matterId,
        scanStatus: "CLEAN",
        deletedAt: null,
        ...(canSeeInternalContent(actor)
          ? {}
          : {
              visibility: {
                in: [Visibility.CLIENT, Visibility.CLIENT_VISIBLE],
              },
            }),
      },
      select: { storageKey: true, originalName: true, mimeType: true },
    });
    if (!document) {
      return new Response("No encontrado", {
        status: 404,
        headers: { "cache-control": "private, no-store" },
      });
    }
    if (document.storageKey.startsWith("quarantine/")) {
      return new Response("No encontrado", {
        status: 404,
        headers: { "cache-control": "private, no-store" },
      });
    }
    const storage = getPrivateStorageProvider();
    const signedUrl = await storage.createSignedDownloadUrl(
      document.storageKey,
      safeDownloadName(document.originalName),
      getDocumentDownloadTtlSeconds(),
    );
    if (signedUrl) {
      await db.auditLog.create({
        data: {
          actorId: actor.id,
          action: "MATTER_DOCUMENT_DOWNLOAD_AUTHORIZED",
          entityType: "Document",
          entityId: documentId,
          metadata: {
            matterId,
            delivery: "SIGNED_URL",
            provider: storage.name,
          },
        },
      });
      return new Response(null, {
        status: 307,
        headers: {
          location: signedUrl,
          "cache-control": "private, no-store",
          "referrer-policy": "no-referrer",
        },
      });
    }
    const bytes = await storage.get(document.storageKey);
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "MATTER_DOCUMENT_DOWNLOAD_AUTHORIZED",
        entityType: "Document",
        entityId: documentId,
        metadata: { matterId, delivery: "PROXIED", provider: storage.name },
      },
    });
    return new Response(bytes, {
      headers: {
        "content-type": document.mimeType,
        "content-disposition": `attachment; filename="${safeDownloadName(document.originalName)}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex",
      },
    });
  } catch (error) {
    const status =
      error instanceof ServiceError || error instanceof RateLimitError
        ? error.status
        : 500;
    const retryAfter =
      error instanceof RateLimitError
        ? Math.max(1, error.retryAfterSeconds).toString()
        : undefined;
    return new Response(
      status === 404
        ? "No encontrado"
        : error instanceof RateLimitError
          ? error.message
          : "No fue posible descargar el archivo",
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
