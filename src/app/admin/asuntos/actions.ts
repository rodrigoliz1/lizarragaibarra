"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { sanitizeMultiline, sanitizeSingleLine } from "@/lib/validation";
import { requireAdmin } from "@/server/policies";

const schema = z.object({
  reference: z
    .string()
    .transform(sanitizeSingleLine)
    .pipe(z.string().min(3).max(80)),
  title: z
    .string()
    .transform(sanitizeSingleLine)
    .pipe(z.string().min(3).max(220)),
  clientId: z.string().cuid(),
  practiceAreaId: z.string().cuid().optional(),
  descriptionPublic: z
    .string()
    .transform(sanitizeMultiline)
    .pipe(z.string().max(5000))
    .optional(),
  descriptionInternal: z
    .string()
    .transform(sanitizeMultiline)
    .pipe(z.string().max(10000))
    .optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  leadId: z.string().cuid(),
  supervisorId: z.string().cuid().optional(),
});

export async function createMatterAction(formData: FormData) {
  const actor = await requireAdmin();
  const input = schema.parse({
    reference: formData.get("reference"),
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    practiceAreaId: formData.get("practiceAreaId") || undefined,
    descriptionPublic: formData.get("descriptionPublic") || undefined,
    descriptionInternal: formData.get("descriptionInternal") || undefined,
    priority: formData.get("priority") || "NORMAL",
    leadId: formData.get("leadId"),
    supervisorId: formData.get("supervisorId") || undefined,
  });
  const assignments = new Map<string, "LEAD_LAWYER" | "SUPERVISING_PARTNER">([
    [input.leadId, "LEAD_LAWYER"],
  ]);
  if (input.supervisorId && input.supervisorId !== input.leadId)
    assignments.set(input.supervisorId, "SUPERVISING_PARTNER");
  await db.$transaction(async (transaction) => {
    const matter = await transaction.matter.create({
      data: {
        reference: input.reference,
        title: input.title,
        clientId: input.clientId,
        practiceAreaId: input.practiceAreaId,
        descriptionPublic: input.descriptionPublic,
        descriptionInternal: input.descriptionInternal,
        priority: input.priority,
        assignments: {
          create: [...assignments].map(([lawyerId, role]) => ({
            lawyerId,
            role,
          })),
        },
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "MATTER_CREATED",
        entityType: "Matter",
        entityId: matter.id,
        metadata: { assignmentCount: assignments.size },
      },
    });
  });
  revalidatePath("/admin/asuntos");
}
