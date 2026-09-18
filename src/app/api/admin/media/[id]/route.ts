import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
import { ensureSameOrigin } from "@/lib/security/request";
import { mediaUsage } from "@/server/services/media-service";
import { apiError } from "@/server/http";
const schema = z.object({
  title: z.string().trim().max(180),
  description: z.string().trim().max(2000),
  altText: z.string().trim().min(1).max(300),
  collection: z.string().trim().min(1).max(80),
  tags: z.array(z.string().trim().max(40)).max(20),
  public: z.boolean(),
  archive: z.boolean().optional(),
});
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    ensureSameOrigin(request);
    const actor = await requireAdmin();
    const { id } = await params;
    const input = schema.parse(await request.json());
    const { archive, ...data } = input;
    await db.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.findUniqueOrThrow({ where: { id } });
      if (archive && (await mediaUsage(id)) > 0) throw new Error("IN_USE");
      await tx.mediaAsset.update({
        where: { id },
        data: { ...data, status: archive ? "ARCHIVED" : asset.status },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: archive ? "MEDIA_ARCHIVED" : "MEDIA_UPDATED",
          entityType: "MediaAsset",
          entityId: id,
        },
      });
    });
    return NextResponse.json({
      ok: true,
      message: input.archive
        ? "Archivo retirado de la biblioteca."
        : "Cambios guardados.",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "IN_USE")
      return NextResponse.json(
        {
          message:
            "Este archivo está en uso. Retire sus referencias antes de archivarlo.",
        },
        { status: 409 },
      );
    return apiError(e);
  }
}
