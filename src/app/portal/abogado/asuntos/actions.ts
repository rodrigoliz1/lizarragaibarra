"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { sanitizeMultiline, sanitizeSingleLine } from "@/lib/validation";
import { requirePartner } from "@/server/policies";
import { AccessDeniedError } from "@/server/services/errors";

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
  leadId: z.string().cuid(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
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
});

export async function createPartnerMatterAction(formData: FormData) {
  const actor = await requirePartner();
  if (actor.role === "ADMIN" || !actor.lawyerProfileId)
    throw new AccessDeniedError();
  const partnerProfileId = actor.lawyerProfileId;
  const input = schema.parse({
    reference: formData.get("reference"),
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    practiceAreaId: formData.get("practiceAreaId") || undefined,
    leadId: formData.get("leadId"),
    priority: formData.get("priority") || "NORMAL",
    descriptionPublic: formData.get("descriptionPublic") || undefined,
    descriptionInternal: formData.get("descriptionInternal") || undefined,
  });
  const [client, lead] = await Promise.all([
    db.clientProfile.findFirst({
      where: {
        id: input.clientId,
        OR: [
          {
            matters: {
              some: {
                assignments: { some: { lawyerId: actor.lawyerProfileId } },
              },
            },
          },
          {
            user: {
              actionTokens: {
                some: { type: "ACCOUNT_INVITE", createdById: actor.id },
              },
            },
          },
        ],
      },
      select: { id: true },
    }),
    db.lawyerProfile.findFirst({
      where: {
        id: input.leadId,
        user: { status: "ACTIVE" },
        OR: [
          { id: actor.lawyerProfileId },
          { supervisorId: actor.lawyerProfileId },
        ],
      },
      select: { id: true },
    }),
  ]);
  if (!client || !lead) throw new AccessDeniedError();
  await db.$transaction(async (transaction) => {
    const matter = await transaction.matter.create({
      data: {
        reference: input.reference,
        title: input.title,
        clientId: client.id,
        practiceAreaId: input.practiceAreaId,
        priority: input.priority,
        descriptionPublic: input.descriptionPublic,
        descriptionInternal: input.descriptionInternal,
        assignments: {
          create: [
            { lawyerId: lead.id, role: "LEAD_LAWYER" },
            ...(lead.id === actor.lawyerProfileId
              ? []
              : [
                  {
                    lawyerId: partnerProfileId,
                    role: "SUPERVISING_PARTNER" as const,
                  },
                ]),
          ],
        },
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "MATTER_CREATED_BY_PARTNER",
        entityType: "Matter",
        entityId: matter.id,
        metadata: { leadId: lead.id },
      },
    });
  });
  revalidatePath("/portal/abogado/asuntos");
}
