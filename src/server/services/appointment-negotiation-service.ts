import {
  AppointmentProposalStatus,
  AppointmentStatus,
  Prisma,
  type AppointmentModality,
} from "@prisma/client";

import {
  buildGoogleCalendarUrl,
  formatDateInTimeZone,
  reservationSlotStarts,
} from "@/lib/calendar";
import { db } from "@/lib/db";
import { renderTransactionalEmail, sendTrackedEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import type { PolicyActor } from "@/server/policies";
import {
  appointmentProposalSideForActor,
  canRespondToAppointmentProposal,
  matterWhereForActor,
} from "@/server/policies";
import { AccessDeniedError, ServiceError } from "@/server/services/errors";
import { getAvailabilityDetails } from "@/server/services/availability-service";
import { synchronizeAppointmentCalendar } from "@/server/services/calendar-sync-service";

type ProposalInput = {
  startAt: Date;
  endAt: Date;
  modality: AppointmentModality;
  location?: string;
  meetingUrl?: string;
  message?: string;
};

function holdExpiry() {
  const minutes = Number(process.env.APPOINTMENT_HOLD_MINUTES || 20);
  const safe = Number.isFinite(minutes)
    ? Math.min(120, Math.max(5, minutes))
    : 20;
  return new Date(Date.now() + safe * 60 * 1000);
}

export async function requireAppointmentAccess(id: string, actor: PolicyActor) {
  const appointment = await db.appointment.findFirst({
    where: {
      id,
      ...(actor.role === "ADMIN"
        ? {}
        : actor.role === "CLIENT"
          ? actor.clientProfileId
            ? { clientId: actor.clientProfileId }
            : { id: "__none__" }
          : actor.lawyerProfileId
            ? {
                OR: [
                  { lawyerId: actor.lawyerProfileId },
                  { matter: matterWhereForActor(actor) },
                ],
              }
            : { id: "__none__" }),
    },
    select: { id: true },
  });
  if (!appointment) throw new AccessDeniedError();
}

async function notifyProposal(appointmentId: string, actor: PolicyActor) {
  const appointment = await db.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    select: {
      reference: true,
      fullName: true,
      email: true,
      client: { select: { user: { select: { id: true, email: true } } } },
      lawyer: { select: { user: { select: { id: true, email: true } } } },
    },
  });
  const clientRecipient = appointment.client?.user.email ?? appointment.email;
  const lawyerRecipient = appointment.lawyer?.user?.email;
  const recipient = actor.role === "CLIENT" ? lawyerRecipient : clientRecipient;
  const recipientId =
    actor.role === "CLIENT"
      ? appointment.lawyer?.user?.id
      : appointment.client?.user.id;
  if (recipientId) {
    await db.notification.create({
      data: {
        recipientId,
        type: "APPOINTMENT_PROPOSAL",
        title: "Nueva propuesta de cita",
        body: `Hay una propuesta pendiente para la cita ${appointment.reference}.`,
        href:
          actor.role === "CLIENT"
            ? "/portal/abogado/citas"
            : "/portal/panel/citas",
      },
    });
  }
  if (!recipient) return;
  const content = renderTransactionalEmail({
    eyebrow: "Agenda",
    title: "Hay una nueva propuesta de cita",
    paragraphs: [
      `La cita ${appointment.reference} tiene una nueva propuesta pendiente de respuesta.`,
      "Ingresa a tu portal para revisar fecha, modalidad y responder de forma inequívoca.",
    ],
    action: {
      label: "Revisar propuesta",
      url: new URL(
        actor.role === "CLIENT"
          ? "/portal/abogado/citas"
          : "/portal/panel/citas",
        getSiteUrl(),
      ).toString(),
    },
  });
  await sendTrackedEmail({
    to: recipient,
    subject: `Nueva propuesta de cita · ${appointment.reference}`,
    template: "appointment-proposed",
    ...content,
    tags: ["appointment", "proposal"],
  }).catch(() => undefined);
}

export async function proposeAppointment(
  actor: PolicyActor,
  appointmentId: string,
  input: ProposalInput,
) {
  await requireAppointmentAccess(appointmentId, actor);
  const appointmentForAvailability = await db.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    select: { lawyerId: true, timezone: true },
  });
  const durationMs = input.endAt.getTime() - input.startAt.getTime();
  if (
    durationMs < 15 * 60 * 1000 ||
    durationMs > 4 * 60 * 60 * 1000 ||
    durationMs % 60_000 !== 0
  ) {
    throw new ServiceError(
      "La duración propuesta no está permitida.",
      400,
      "INVALID_APPOINTMENT_DURATION",
    );
  }
  const availableSlots = await getAvailabilityDetails({
    date: formatDateInTimeZone(
      input.startAt,
      appointmentForAvailability.timezone,
    ),
    lawyerId: appointmentForAvailability.lawyerId ?? undefined,
    modality: input.modality,
  });
  const availableSlot = availableSlots.find(
    (slot) =>
      slot.startsAt.getTime() === input.startAt.getTime() &&
      slot.endsAt.getTime() === input.endAt.getTime(),
  );
  if (!availableSlot) {
    throw new ServiceError(
      "El horario propuesto no está disponible.",
      409,
      "SLOT_CONFLICT",
    );
  }
  const created = await db
    .$transaction(async (transaction) => {
      const appointment = await transaction.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        select: { id: true, status: true, lawyerId: true },
      });
      if (
        ["CANCELLED", "DECLINED", "COMPLETED", "NO_SHOW"].includes(
          appointment.status,
        )
      ) {
        throw new ServiceError(
          "La cita ya no admite propuestas.",
          409,
          "APPOINTMENT_CLOSED",
        );
      }
      await transaction.appointmentHold.deleteMany({
        where: { OR: [{ expiresAt: { lte: new Date() } }, { appointmentId }] },
      });
      await transaction.appointmentProposal.updateMany({
        where: { appointmentId, status: AppointmentProposalStatus.PENDING },
        data: {
          status: AppointmentProposalStatus.SUPERSEDED,
          respondedAt: new Date(),
        },
      });
      const resourceKey = appointment.lawyerId
        ? `lawyer:${appointment.lawyerId}`
        : "firm:intake";
      const collision = await transaction.appointmentHold.findFirst({
        where: {
          resourceKey,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
          startsAt: { lt: input.endAt },
          endsAt: { gt: input.startAt },
        },
        select: { id: true },
      });
      const confirmed = await transaction.appointment.findFirst({
        where: {
          id: { not: appointmentId },
          lawyerId: appointment.lawyerId,
          status: "CONFIRMED",
          confirmedStartAt: { lt: input.endAt },
          confirmedEndAt: { gt: input.startAt },
        },
        select: { id: true },
      });
      if (collision || confirmed) {
        throw new ServiceError(
          "El horario acaba de dejar de estar disponible.",
          409,
          "SLOT_CONFLICT",
        );
      }
      const proposal = await transaction.appointmentProposal.create({
        data: {
          appointmentId,
          proposedById: actor.id,
          proposerSide: appointmentProposalSideForActor(actor),
          lawyerId: appointment.lawyerId,
          ...input,
          hold: {
            create: {
              appointmentId,
              lawyerId: appointment.lawyerId,
              resourceKey,
              startsAt: input.startAt,
              endsAt: availableSlot.occupiedUntil,
              expiresAt: holdExpiry(),
            },
          },
        },
        select: { id: true, startAt: true, endAt: true, status: true },
      });
      await transaction.appointment.update({
        where: { id: appointmentId },
        data: {
          status:
            actor.role === "CLIENT"
              ? AppointmentStatus.PROPOSED_BY_CLIENT
              : AppointmentStatus.PROPOSED_BY_LAWYER,
          proposedStartAt: input.startAt,
          proposedEndAt: input.endAt,
          modality: input.modality,
          location: input.location || null,
          meetingUrl: input.meetingUrl || null,
          lastActorId: actor.id,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "APPOINTMENT_PROPOSED",
          entityType: "AppointmentProposal",
          entityId: proposal.id,
          metadata: { appointmentId },
        },
      });
      return proposal;
    })
    .catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ServiceError(
          "El horario acaba de dejar de estar disponible.",
          409,
          "SLOT_CONFLICT",
        );
      }
      throw error;
    });
  await notifyProposal(appointmentId, actor);
  return created;
}

export async function respondToAppointmentProposal(
  actor: PolicyActor,
  appointmentId: string,
  proposalId: string,
  action: "accept" | "reject",
) {
  await requireAppointmentAccess(appointmentId, actor);
  const result = await db
    .$transaction(async (transaction) => {
      const proposal = await transaction.appointmentProposal.findFirst({
        where: { id: proposalId, appointmentId, status: "PENDING" },
        include: { hold: true, appointment: true },
      });
      if (
        !proposal ||
        !proposal.hold ||
        proposal.hold.expiresAt <= new Date()
      ) {
        throw new ServiceError(
          "La propuesta venció o ya fue respondida.",
          409,
          "PROPOSAL_UNAVAILABLE",
        );
      }
      if (!canRespondToAppointmentProposal(actor, proposal.proposerSide)) {
        throw new ServiceError(
          "La propuesta debe responderla la otra parte.",
          403,
          "SAME_SIDE_RESPONSE",
        );
      }
      const response = await transaction.appointmentProposal.updateMany({
        where: {
          id: proposal.id,
          appointmentId,
          status: AppointmentProposalStatus.PENDING,
        },
        data: {
          status:
            action === "accept"
              ? AppointmentProposalStatus.ACCEPTED
              : AppointmentProposalStatus.REJECTED,
          respondedAt: new Date(),
        },
      });
      if (response.count !== 1) {
        throw new ServiceError(
          "La propuesta venció o ya fue respondida.",
          409,
          "PROPOSAL_UNAVAILABLE",
        );
      }
      if (action === "reject") {
        await transaction.appointmentHold.delete({
          where: { id: proposal.hold.id },
        });
        const isReschedule = Boolean(
          proposal.appointment.confirmedAt &&
          proposal.appointment.confirmedStartAt &&
          proposal.appointment.confirmedEndAt,
        );
        await transaction.appointment.update({
          where: { id: appointmentId },
          data: isReschedule
            ? {
                status: "CONFIRMED",
                proposedStartAt: null,
                proposedEndAt: null,
                lastActorId: actor.id,
              }
            : {
                status: "DECLINED",
                declinedAt: new Date(),
                lastActorId: actor.id,
              },
        });
        if (isReschedule) {
          await transaction.appointmentChangeRequest.updateMany({
            where: {
              appointmentId,
              type: "RESCHEDULE",
              status: "PENDING",
              requestedStartAt: proposal.startAt,
            },
            data: { status: "REJECTED", resolvedAt: new Date() },
          });
        }
        return { confirmed: false, appointment: proposal.appointment };
      }
      const durationMinutes = Math.max(
        15,
        Math.round(
          (proposal.endAt.getTime() - proposal.startAt.getTime()) / 60000,
        ),
      );
      await transaction.appointmentHold.update({
        where: { id: proposal.hold.id },
        data: {
          status: "CONFIRMED",
          expiresAt: new Date("9999-12-31T23:59:59.000Z"),
        },
      });
      await transaction.appointmentReservationSlot.deleteMany({
        where: { appointmentId },
      });
      const bufferMinutes = Math.max(
        0,
        Math.round(
          (proposal.hold.endsAt.getTime() - proposal.endAt.getTime()) / 60000,
        ),
      );
      await transaction.appointmentReservationSlot.createMany({
        data: reservationSlotStarts(
          proposal.startAt,
          durationMinutes,
          bufferMinutes,
        ).map((startsAt) => ({
          appointmentId,
          resourceKey: proposal.hold!.resourceKey,
          startsAt,
        })),
      });
      const appointment = await transaction.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "CONFIRMED",
          startAt: proposal.startAt,
          endAt: proposal.endAt,
          confirmedStartAt: proposal.startAt,
          confirmedEndAt: proposal.endAt,
          confirmedAt: new Date(),
          acceptedById: actor.id,
          lastActorId: actor.id,
          durationMinutes,
          icsSequence: { increment: 1 },
          calendarSyncStatus: "PENDING",
          calendarSyncError: null,
          calendarSyncLockedAt: null,
          calendarSyncLockedBy: null,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "APPOINTMENT_CONFIRMED",
          entityType: "Appointment",
          entityId: appointmentId,
        },
      });
      await transaction.appointmentChangeRequest.updateMany({
        where: {
          appointmentId,
          type: "RESCHEDULE",
          status: "PENDING",
          requestedStartAt: proposal.startAt,
        },
        data: { status: "APPROVED", resolvedAt: new Date() },
      });
      return { confirmed: true, appointment };
    })
    .catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ServiceError(
          "El horario acaba de dejar de estar disponible.",
          409,
          "SLOT_CONFLICT",
        );
      }
      throw error;
    });

  if (result.confirmed) {
    await synchronizeAppointmentCalendar(appointmentId).catch(() => undefined);
    const details = await db.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: {
        practiceArea: { select: { name: true } },
        client: { select: { user: { select: { id: true, email: true } } } },
        lawyer: {
          select: {
            displayName: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
    });
    const icsUrl = new URL(
      `/api/portal/citas/${appointmentId}/ics`,
      getSiteUrl(),
    ).toString();
    const googleUrl = buildGoogleCalendarUrl({
      startsAt: details.confirmedStartAt ?? details.startAt,
      endsAt: details.confirmedEndAt ?? details.endAt,
      title: `Consulta LIZÁRRAGA & IBARRA ABOGADOS · ${details.practiceArea.name}`,
      description: `Referencia ${details.reference}. Consulta legal privada.`,
      location: details.meetingUrl || details.location,
    });
    const content = renderTransactionalEmail({
      eyebrow: "Agenda confirmada",
      title: "Tu cita quedó confirmada",
      greeting: `Hola ${details.fullName},`,
      paragraphs: [
        "Ambas partes aceptaron el horario. Conserva esta confirmación y agrega el evento a tu calendario.",
        `Profesional: ${details.lawyer?.displayName || "LIZÁRRAGA & IBARRA ABOGADOS"}.`,
        `Google Calendar: ${googleUrl}`,
      ],
      details: [
        { label: "Referencia", value: details.reference },
        { label: "Fecha UTC", value: details.startAt.toISOString() },
        { label: "Zona horaria", value: details.timezone },
        { label: "Área", value: details.practiceArea.name },
      ],
      action: { label: "Descargar invitación ICS", url: icsUrl },
    });
    await sendTrackedEmail({
      to: details.client?.user.email ?? details.email,
      subject: `Cita confirmada · ${details.reference}`,
      template: "appointment-confirmed",
      ...content,
      tags: ["appointment", "confirmed"],
    }).catch(() => undefined);
    const recipients = [
      details.client?.user.id,
      details.lawyer?.user?.id,
    ].filter((id): id is string => Boolean(id));
    if (recipients.length) {
      await db.notification.createMany({
        data: recipients.map((recipientId) => ({
          recipientId,
          type: "APPOINTMENT_CONFIRMED" as const,
          title: "Cita confirmada",
          body: `La cita ${details.reference} quedó confirmada.`,
          href:
            recipientId === details.lawyer?.user?.id
              ? "/portal/abogado/citas"
              : "/portal/panel/citas",
          metadata: { appointmentId },
        })),
      });
    }
  }
  return result;
}
