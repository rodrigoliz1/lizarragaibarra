import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  caseStudySchema,
  type CaseStudyInput,
} from "@/lib/validation/case-study";
import { AccessDeniedError, ServiceError } from "./errors";
import type { PolicyActor } from "@/server/policies";
export async function saveCaseStudy(
  actor: PolicyActor,
  id: string | null,
  input: CaseStudyInput,
) {
  if (actor.role !== "ADMIN") throw new AccessDeniedError();
  const { reviewed, ...data } = caseStudySchema.parse(input);
  return db.$transaction(
    async (tx) => {
      if (data.coverImageId) {
        const media = await tx.mediaAsset.findFirst({
          where: {
            id: data.coverImageId,
            status: "READY",
            mimeType: { startsWith: "image/" },
          },
        });
        if (!media)
          throw new ServiceError(
            "Seleccione una imagen disponible.",
            400,
            "INVALID_MEDIA",
          );
      }
      const existing = id
        ? await tx.caseStudy.findUniqueOrThrow({ where: { id } })
        : null;
      const values = {
        ...data,
        publishedAt:
          data.status === "PUBLISHED"
            ? existing?.publishedAt || new Date()
            : null,
        confidentialityReviewedAt: reviewed ? new Date() : null,
        confidentialityReviewedBy: reviewed ? actor.id : null,
      };
      const saved = existing
        ? await tx.caseStudy.update({
            where: { id: existing.id },
            data: values,
          })
        : await tx.caseStudy.create({ data: values });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action:
            data.status === "PUBLISHED" ? "CASE_PUBLISHED" : "CASE_UPDATED",
          entityType: "CaseStudy",
          entityId: saved.id,
          metadata: { status: saved.status, visibility: saved.visibility },
        },
      });
      return saved;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
