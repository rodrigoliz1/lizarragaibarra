import { Prisma, Visibility } from "@prisma/client";

import { db } from "@/lib/db";
import { renderTransactionalEmail, sendTrackedEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import type { z } from "zod";
import type { portalMessageSchema } from "@/lib/validation";
import { toMatterSummaryDTO, toVisibleTimelineItem } from "@/server/dto/matter";
import {
  canSeeInternalContent,
  canSeeRestrictedInternalContent,
  matterWhereForActor,
  requireMatterAccess,
  type PolicyActor,
} from "@/server/policies";
import { AccessDeniedError } from "@/server/services/errors";

type PortalMessageInput = z.infer<typeof portalMessageSchema>;

export async function getPortalSummary(actor: PolicyActor) {
  const matterWhere = matterWhereForActor(actor);
  const appointmentWhere: Prisma.AppointmentWhereInput =
    actor.role === "ADMIN"
      ? {}
      : actor.role === "CLIENT"
        ? actor.clientProfileId
          ? { clientId: actor.clientProfileId }
          : { id: "__none__" }
        : actor.lawyerProfileId
          ? { lawyerId: actor.lawyerProfileId }
          : { id: "__none__" };

  const [matters, appointments, unreadNotifications] = await Promise.all([
    db.matter.findMany({
      where: matterWhere,
      select: {
        id: true,
        reference: true,
        title: true,
        status: true,
        stage: true,
        nextActionAt: true,
        nextActionPublic: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    db.appointment.findMany({
      where: {
        ...appointmentWhere,
        startAt: { gte: new Date() },
        status: {
          in: [
            "REQUESTED",
            "LAWYER_REVIEW",
            "CLIENT_REVIEW",
            "PROPOSED_BY_LAWYER",
            "PROPOSED_BY_CLIENT",
            "CONFIRMED",
            "PENDING_SYNC",
            "RESCHEDULE_REQUESTED",
          ],
        },
      },
      select: {
        id: true,
        reference: true,
        startAt: true,
        endAt: true,
        modality: true,
        status: true,
        practiceArea: { select: { name: true } },
        lawyer: { select: { displayName: true } },
        proposals: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            proposerSide: true,
            startAt: true,
            endAt: true,
            modality: true,
            message: true,
            hold: { select: { expiresAt: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
      take: 10,
    }),
    db.notification.count({ where: { recipientId: actor.id, readAt: null } }),
  ]);

  return {
    matters: matters.map(toMatterSummaryDTO),
    upcomingAppointments: appointments.map((appointment) => ({
      ...appointment,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      proposals: appointment.proposals.map((proposal) => ({
        ...proposal,
        startAt: proposal.startAt.toISOString(),
        endAt: proposal.endAt.toISOString(),
        hold: proposal.hold
          ? { expiresAt: proposal.hold.expiresAt.toISOString() }
          : null,
      })),
    })),
    unreadNotifications,
  };
}

export async function getPortalMatter(actor: PolicyActor, matterId: string) {
  await requireMatterAccess(matterId, actor);
  const internal = canSeeInternalContent(actor);
  const restrictedInternal = canSeeRestrictedInternalContent(actor);
  const visibilityWhere: Prisma.MessageWhereInput | undefined =
    actor.role === "CLIENT"
      ? {
          visibility: {
            in: [Visibility.CLIENT, Visibility.CLIENT_VISIBLE],
          },
        }
      : restrictedInternal
        ? undefined
        : {
            visibility: {
              in: [
                Visibility.CLIENT,
                Visibility.CLIENT_VISIBLE,
                Visibility.INTERNAL,
              ],
            },
          };
  const documentWhere: Prisma.DocumentWhereInput =
    actor.role === "CLIENT"
      ? {
          deletedAt: null,
          scanStatus: "CLEAN",
          visibility: {
            in: [Visibility.CLIENT, Visibility.CLIENT_VISIBLE],
          },
        }
      : restrictedInternal
        ? { deletedAt: null }
        : {
            deletedAt: null,
            visibility: { not: Visibility.INTERNAL_ONLY },
          };
  const matter = await db.matter.findUnique({
    where: { id: matterId },
    select: {
      id: true,
      reference: true,
      title: true,
      descriptionPublic: true,
      descriptionInternal: internal,
      status: true,
      stage: true,
      nextActionAt: true,
      nextActionPublic: true,
      updatedAt: true,
      assignments: {
        select: {
          role: true,
          lawyer: {
            select: {
              slug: true,
              displayName: true,
              position: true,
              image: true,
            },
          },
        },
      },
      updates: {
        where:
          actor.role === "CLIENT"
            ? {
                visibility: {
                  in: [Visibility.CLIENT, Visibility.CLIENT_VISIBLE],
                },
                publishedAt: { not: null },
              }
            : restrictedInternal
              ? undefined
              : { visibility: { not: Visibility.INTERNAL_ONLY } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          body: true,
          visibility: true,
          createdAt: true,
        },
      },
      documents: {
        where: documentWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          originalName: true,
          mimeType: true,
          size: true,
          visibility: true,
          scanStatus: true,
          scanError: true,
          scannedAt: true,
          createdAt: true,
        },
      },
      messages: {
        where: visibilityWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true,
          body: true,
          visibility: true,
          createdAt: true,
          sender: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });
  if (!matter) throw new AccessDeniedError();

  return {
    ...toMatterSummaryDTO(matter),
    descriptionPublic: matter.descriptionPublic,
    ...(internal ? { descriptionInternal: matter.descriptionInternal } : {}),
    assignments: matter.assignments,
    updates: matter.updates.map(toVisibleTimelineItem),
    documents: matter.documents.map(({ scanError, ...document }) => ({
      ...document,
      createdAt: document.createdAt.toISOString(),
      scannedAt: document.scannedAt?.toISOString() ?? null,
      ...(internal
        ? {
            scanError: scanError?.startsWith("SCAN_IN_PROGRESS:")
              ? null
              : scanError,
          }
        : {}),
      downloadUrl: `/api/portal/asuntos/${matter.id}/documentos/${document.id}`,
    })),
    messages: matter.messages.toReversed().map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function createPortalMessage(
  actor: PolicyActor,
  matterId: string,
  input: PortalMessageInput,
) {
  await requireMatterAccess(matterId, actor);
  const visibility =
    actor.role === "CLIENT"
      ? Visibility.CLIENT
      : (input.visibility ?? Visibility.CLIENT);
  if (
    visibility === Visibility.INTERNAL_ONLY &&
    !canSeeRestrictedInternalContent(actor)
  ) {
    throw new AccessDeniedError();
  }
  const idempotencyKey = input.clientRequestId
    ? `${actor.id}:${input.clientRequestId}`
    : undefined;
  if (idempotencyKey) {
    const existing = await db.message.findUnique({
      where: { idempotencyKey },
      select: {
        id: true,
        matterId: true,
        senderId: true,
        body: true,
        visibility: true,
        createdAt: true,
      },
    });
    if (existing) {
      if (existing.matterId !== matterId || existing.senderId !== actor.id) {
        throw new AccessDeniedError();
      }
      return existing;
    }
  }
  const message = await db.$transaction(async (transaction) => {
    const created = await transaction.message.create({
      data: {
        matterId,
        senderId: actor.id,
        body: input.body,
        visibility,
        idempotencyKey,
      },
      select: { id: true, body: true, visibility: true, createdAt: true },
    });
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: "MATTER_MESSAGE_CREATED",
        entityType: "Message",
        entityId: created.id,
        metadata: { matterId, visibility },
      },
    });
    return created;
  });
  if (visibility === Visibility.CLIENT) {
    const matter = await db.matter.findUnique({
      where: { id: matterId },
      select: {
        reference: true,
        client: { select: { user: { select: { id: true, email: true } } } },
        assignments: {
          select: {
            lawyer: { select: { user: { select: { id: true, email: true } } } },
          },
        },
      },
    });
    const recipients =
      actor.role === "CLIENT"
        ? (matter?.assignments
            .map((item) => item.lawyer.user)
            .filter((item): item is { id: string; email: string } =>
              Boolean(item),
            ) ?? [])
        : matter?.client.user
          ? [matter.client.user]
          : [];
    const uniqueRecipients = [
      ...new Map(recipients.map((item) => [item.id, item])).values(),
    ].filter((recipient) => recipient.id !== actor.id);
    if (uniqueRecipients.length) {
      await db.notification.createMany({
        data: uniqueRecipients.map((recipient) => ({
          recipientId: recipient.id,
          type: "NEW_MESSAGE" as const,
          title: "Nuevo mensaje en un asunto",
          body: `Tienes un mensaje nuevo en el asunto ${matter?.reference ?? "asignado"}.`,
          href:
            actor.role === "CLIENT"
              ? `/portal/abogado/asuntos/${matterId}`
              : `/portal/panel/asuntos/${matterId}`,
          metadata: { matterId },
        })),
      });
      const cooldownMinutes = Math.max(
        0,
        Number(process.env.MESSAGE_EMAIL_COOLDOWN_MINUTES || 5),
      );
      const recent = await db.message.findFirst({
        where: {
          matterId,
          id: { not: message.id },
          notificationSentAt: {
            gte: new Date(Date.now() - cooldownMinutes * 60 * 1000),
          },
        },
        select: { id: true },
      });
      if (!recent) {
        const portalPath =
          actor.role === "CLIENT"
            ? `/portal/abogado/asuntos/${matterId}`
            : `/portal/panel/asuntos/${matterId}`;
        const content = renderTransactionalEmail({
          eyebrow: "Portal privado",
          title: "Hay un nuevo mensaje en tu asunto",
          paragraphs: [
            `Se registró un nuevo mensaje en el asunto ${matter?.reference ?? "asignado"}.`,
            "Por confidencialidad, consulta el contenido completo dentro del portal seguro.",
          ],
          action: {
            label: "Abrir conversación",
            url: new URL(portalPath, getSiteUrl()).toString(),
          },
        });
        await Promise.allSettled(
          uniqueRecipients.map((recipient) =>
            sendTrackedEmail({
              to: recipient.email,
              subject: `Nuevo mensaje · ${matter?.reference ?? "LIZÁRRAGA & IBARRA ABOGADOS"}`,
              template:
                actor.role === "CLIENT"
                  ? "new-client-message"
                  : "new-lawyer-message",
              ...content,
              tags: ["matter", "message"],
            }),
          ),
        );
        await db.message.update({
          where: { id: message.id },
          data: { notificationSentAt: new Date() },
        });
      }
    }
  }
  return { ...message, createdAt: message.createdAt.toISOString() };
}
