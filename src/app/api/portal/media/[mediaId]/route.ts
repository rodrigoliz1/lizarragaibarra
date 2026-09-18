import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getPublicMediaStorageProvider } from "@/lib/storage/public";
import { requireActor } from "@/server/policies";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ mediaId: string }> },
) {
  const [{ mediaId }, actor] = await Promise.all([
    context.params,
    requireActor(["LAWYER", "ADMIN"]),
  ]);
  const asset = await db.mediaAsset.findFirst({
    where: {
      id: mediaId,
      status: "READY",
      ...(actor.role === "ADMIN" ? {} : { uploadedById: actor.id }),
    },
    select: { storageKey: true, mimeType: true, checksum: true },
  });
  if (!asset) {
    return NextResponse.json(
      { message: "Imagen no disponible." },
      { status: 404 },
    );
  }
  const bytes = await getPublicMediaStorageProvider().get(asset.storageKey);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": asset.mimeType,
      "cache-control": "private, max-age=300",
      etag: `"${asset.checksum}"`,
      "x-content-type-options": "nosniff",
    },
  });
}
