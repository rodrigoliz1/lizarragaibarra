"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";

const schema = z.object({
  id: z.string().cuid(),
  emailPublic: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  linkedInUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => new URL(value).hostname.endsWith("linkedin.com"))
    .optional()
    .or(z.literal("")),
});

export async function updateLawyerContactAction(formData: FormData) {
  const actor = await requireAdmin();
  const input = schema.parse({
    id: formData.get("id"),
    emailPublic: formData.get("emailPublic") || "",
    phone: formData.get("phone") || "",
    linkedInUrl: formData.get("linkedInUrl") || "",
  });
  await db.$transaction([
    db.lawyerProfile.update({
      where: { id: input.id },
      data: {
        emailPublic: input.emailPublic || null,
        phone: input.phone || null,
        linkedInUrl: input.linkedInUrl || null,
      },
    }),
    db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "LAWYER_PUBLIC_CONTACT_UPDATED",
        entityType: "LawyerProfile",
        entityId: input.id,
      },
    }),
  ]);
  revalidatePath(`/admin/abogados/${input.id}`);
  revalidatePath("/equipo", "layout");
}
