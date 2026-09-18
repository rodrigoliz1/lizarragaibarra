import { db } from "@/lib/db";
import { renderTransactionalEmail, sendTrackedEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import type { matterUpdateSchema } from "@/lib/validation";
import { requireMatterAccess, type PolicyActor } from "@/server/policies";
import { AccessDeniedError } from "@/server/services/errors";
import type { z } from "zod";

type Input = z.infer<typeof matterUpdateSchema>;

export async function createMatterUpdate(
  actor: PolicyActor,
  matterId: string,
  input: Input,
) {
  if (actor.role === "CLIENT") throw new AccessDeniedError();
  await requireMatterAccess(matterId, actor);
  const clientVisible = ["CLIENT", "CLIENT_VISIBLE"].includes(input.visibility);
  const result = await db.$transaction(async (transaction) => {
    const matter = await transaction.matter.findUniqueOrThrow({
      where: { id: matterId },
      select: {
        reference: true,
        title: true,
        client: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    const update = await transaction.matterUpdate.create({
      data: {
        matterId,
        title: input.title,
        summary: input.summary,
        body: input.body,
        effectiveAt: input.effectiveAt,
        relatedStage: input.relatedStage,
        nextAction: input.nextAction,
        nextActionAt: input.nextActionAt,
        visibility: input.visibility,
        publishedAt: input.publish ? new Date() : null,
        createdById: actor.id,
      },
    });
    if (input.publish && clientVisible) {
      await transaction.notification.create({
        data: {
          recipientId: matter.client.user.id,
          type: "MATTER_UPDATE",
          title: "Nueva actualización en tu asunto",
          body: `Hay una actualización en el asunto ${matter.reference}.`,
          href: `/portal/panel/asuntos/${matterId}`,
          metadata: { matterId, updateId: update.id },
        },
      });
    }
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: input.publish
          ? "MATTER_UPDATE_PUBLISHED"
          : "MATTER_UPDATE_DRAFTED",
        entityType: "MatterUpdate",
        entityId: update.id,
        metadata: { matterId, visibility: input.visibility },
      },
    });
    if (input.nextAction || input.nextActionAt || input.relatedStage) {
      await transaction.matter.update({
        where: { id: matterId },
        data: {
          nextActionPublic: clientVisible ? input.nextAction : undefined,
          nextActionAt: input.nextActionAt,
          stage: input.relatedStage,
        },
      });
    }
    return { update, matter };
  });

  let emailStatus: "NOT_REQUIRED" | "SENT" | "FAILED" = "NOT_REQUIRED";
  if (input.publish && clientVisible) {
    const content = renderTransactionalEmail({
      eyebrow: "Seguimiento de asunto",
      title: "Hay una nueva actualización en tu asunto",
      greeting: `Hola ${result.matter.client.user.name},`,
      paragraphs: [
        `El equipo publicó una actualización en el asunto ${result.matter.reference}.`,
        input.summary,
        "Consulta el detalle completo dentro de tu portal privado.",
      ],
      action: {
        label: "Consultar actualización",
        url: new URL(
          `/portal/panel/asuntos/${matterId}`,
          getSiteUrl(),
        ).toString(),
      },
    });
    emailStatus = await sendTrackedEmail({
      to: result.matter.client.user.email,
      subject: `Actualización de asunto · ${result.matter.reference}`,
      template: "matter-update",
      ...content,
      tags: ["matter", "update"],
    })
      .then(() => "SENT" as const)
      .catch(() => "FAILED" as const);
  }
  return { ...result.update, emailStatus };
}
