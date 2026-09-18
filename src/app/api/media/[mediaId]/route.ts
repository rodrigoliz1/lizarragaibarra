import { NextResponse } from "next/server";
import { getPublicMediaStorageProvider } from "@/lib/storage/public";
import { isPublicMedia } from "@/server/services/media-service";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    const { mediaId } = await params;
    const asset = await isPublicMedia(mediaId);
    if (!asset || asset.embedUrl)
      return NextResponse.json(
        { message: "Contenido no disponible." },
        { status: 404 },
      );
    const bytes = await getPublicMediaStorageProvider().get(asset.storageKey);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": asset.mimeType,
        "cache-control": "public, max-age=0, must-revalidate",
        "x-content-type-options": "nosniff",
        ...(asset.mimeType === "application/pdf"
          ? { "content-disposition": 'attachment; filename="publicacion.pdf"' }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Contenido no disponible." },
      { status: 503 },
    );
  }
}
