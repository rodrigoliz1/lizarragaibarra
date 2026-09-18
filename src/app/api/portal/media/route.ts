import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import { db } from "@/lib/db";
import { ensureSameOrigin, RequestSecurityError } from "@/lib/security/request";
import { getPublicMediaStorageProvider } from "@/lib/storage/public";
import { requireActor } from "@/server/policies";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";

const allowedInputTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function POST(request: Request) {
  const uploadedKeys: string[] = [];
  try {
    ensureSameOrigin(request);
    const actor = await requireActor(["LAWYER", "ADMIN"]);
    const declared = Number(request.headers.get("content-length") || 0);
    const maxMb = Math.min(
      20,
      Math.max(1, Number(process.env.MAX_ARTICLE_IMAGE_MB || 10)),
    );
    if (declared > maxMb * 1024 * 1024 + 1024 * 100) {
      return NextResponse.json(
        { ok: false, message: `La imagen supera ${maxMb} MB.` },
        { status: 413 },
      );
    }
    const form = await request.formData();
    const file = form.get("file");
    const altText = String(form.get("altText") || "").trim();
    const caption = String(form.get("caption") || "").trim();
    const type = String(form.get("type") || "ARTICLE_HERO");
    if (
      !(file instanceof File) ||
      !/\.(jpe?g|png|webp|avif)$/i.test(file.name) ||
      !allowedInputTypes.has(file.type) ||
      !altText ||
      altText.length > 300 ||
      caption.length > 500 ||
      !["ARTICLE_HERO", "ARTICLE_INLINE", "LAWYER_PROFILE"].includes(type)
    ) {
      return NextResponse.json(
        { ok: false, message: "Revisa el archivo, tipo y texto alternativo." },
        { status: 400 },
      );
    }
    const source = Buffer.from(await file.arrayBuffer());
    if (!source.length || source.length > maxMb * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, message: `La imagen debe pesar menos de ${maxMb} MB.` },
        { status: 413 },
      );
    }
    const metadata = await sharp(source, {
      failOn: "warning",
      limitInputPixels: 50_000_000,
    }).metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      !["jpeg", "png", "webp", "heif"].includes(metadata.format || "")
    ) {
      return NextResponse.json(
        { ok: false, message: "El archivo no contiene una imagen compatible." },
        { status: 415 },
      );
    }
    const maxWidth = Math.min(
      3000,
      Math.max(800, Number(process.env.ARTICLE_IMAGE_MAX_WIDTH || 2000)),
    );
    const [large, thumbnail] = await Promise.all([
      sharp(source)
        .rotate()
        .resize({
          width: maxWidth,
          height: maxWidth,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 84, smartSubsample: true })
        .toBuffer({ resolveWithObject: true }),
      sharp(source)
        .rotate()
        .resize({
          width: 600,
          height: 600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80, smartSubsample: true })
        .toBuffer({ resolveWithObject: true }),
    ]);
    const storage = getPublicMediaStorageProvider();
    const largeStored = await storage.put({
      bytes: large.data,
      mimeType: "image/webp",
    });
    uploadedKeys.push(largeStored.key);
    const thumbnailStored = await storage.put({
      bytes: thumbnail.data,
      mimeType: "image/webp",
    });
    uploadedKeys.push(thumbnailStored.key);
    const asset = await db.$transaction(async (transaction) => {
      const created = await transaction.mediaAsset.create({
        data: {
          type: type as "ARTICLE_HERO" | "ARTICLE_INLINE" | "LAWYER_PROFILE",
          title: file.name.replace(/\.[^.]+$/, "").slice(0, 180),
          collection: String(form.get("collection") || "General").slice(0, 80),
          status: "READY",
          storageKey: largeStored.key,
          mimeType: "image/webp",
          width: large.info.width,
          height: large.info.height,
          size: largeStored.size,
          altText,
          caption: caption || null,
          checksum: createHash("sha256").update(large.data).digest("hex"),
          variants: {
            thumbnail: {
              storageKey: thumbnailStored.key,
              width: thumbnail.info.width,
              height: thumbnail.info.height,
              size: thumbnailStored.size,
              mimeType: "image/webp",
            },
          },
          uploadedById: actor.id,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "MEDIA_UPLOADED",
          entityType: "MediaAsset",
          entityId: created.id,
          metadata: {
            type,
            width: created.width,
            height: created.height,
            size: created.size,
          },
        },
      });
      return created;
    });
    return NextResponse.json(
      {
        ok: true,
        message: "Imagen optimizada y guardada.",
        data: {
          id: asset.id,
          url: `/api/portal/media/${asset.id}`,
          width: asset.width,
          height: asset.height,
          size: asset.size,
          altText: asset.altText,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const storage = uploadedKeys.length
      ? getPublicMediaStorageProvider()
      : null;
    if (storage)
      await Promise.allSettled(uploadedKeys.map((key) => storage.delete(key)));
    const status =
      error instanceof RequestSecurityError || error instanceof ServiceError
        ? error.status
        : 500;
    return NextResponse.json(
      {
        ok: false,
        message:
          status === 500
            ? "No fue posible procesar la imagen."
            : error instanceof Error
              ? error.message
              : "Acceso no permitido.",
      },
      { status },
    );
  }
}
