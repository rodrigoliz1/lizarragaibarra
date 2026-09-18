"use server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
const schema = z.object({
  id: z.string().cuid(),
  displayName: z.string().trim().min(2).max(150),
  position: z.string().trim().min(2).max(100),
  bio: z.string().trim().min(20).max(12000),
  education: z.string().trim().min(3).max(1000),
  phone: z.string().regex(/^\d{10}$/),
  emailPublic: z.string().email(),
  photoId: z.string().cuid().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: z.boolean(),
  featured: z.boolean(),
  areaIds: z.array(z.string().cuid()).max(20),
});
export async function saveProfile(form: FormData) {
  const actor = await requireAdmin();
  const id = String(form.get("id"));
  const parsed = schema.safeParse({
    ...Object.fromEntries(form),
    photoId: form.get("photoId") || null,
    active: form.get("active") === "on",
    featured: form.get("featured") === "on",
    areaIds: form.getAll("areaIds"),
  });
  if (!parsed.success) redirect("/admin/equipo/" + id + "?error=datos");
  try {
    const { id: profileId, areaIds, ...data } = parsed.data;
    await db.$transaction(
      async (tx) => {
        if (data.photoId) {
          const image = await tx.mediaAsset.findFirst({
            where: {
              id: data.photoId,
              status: "READY",
              mimeType: { startsWith: "image/" },
            },
          });
          if (!image) throw new Error("INVALID_MEDIA");
        }
        await tx.lawyerPracticeArea.deleteMany({
          where: { lawyerId: profileId },
        });
        await tx.lawyerProfile.update({
          where: { id: profileId },
          data: {
            ...data,
            areas: {
              create: areaIds.map((a, i) => ({
                practiceAreaId: a,
                isPrimary: i === 0,
              })),
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: "TEAM_PROFILE_UPDATED",
            entityType: "LawyerProfile",
            entityId: profileId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch {
    redirect("/admin/equipo/" + id + "?error=guardado");
  }
  revalidatePath("/", "layout");
  redirect("/admin/equipo/" + id + "?guardado=1");
}
