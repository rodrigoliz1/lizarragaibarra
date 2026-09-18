import { AppointmentStatus, Prisma } from "@prisma/client";

import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  reservationResourceKey,
} from "@/lib/calendar";
import { db } from "@/lib/db";
import { renderTransactionalEmail, sendTrackedEmail } from "@/lib/email";
import { hashToken } from "@/lib/security/tokens";
import { getSiteUrl } from "@/lib/site-url";
import { getAvailabilityDetails } from "@/server/services/availability-service";
import { synchronizeAppointmentCalendar } from "@/server/services/calendar-sync-service";
import type {
  appointmentCancellationSchema,
  appointmentRescheduleRequestSchema,
} from "@/lib/validation";
import type { z } from "zod";

import { ResourceNotFoundError, ServiceError } from "./errors";

type CancellationInput = z.infer<typeof appointmentCancellationSchema>;
type RescheduleInput = z.infer<typeof appointmentRescheduleRequestSchema>;

const modalityLabels = {
  IN_PERSON: "Presencial",
  VIDEO_CALL: "Videollamada",
  PHONE_CALL: "Llamada telefónica",
} as const;

type AppointmentEmailContext = {
  reference: string;
  fullName: string;
  email: string;
  startAt: Date;
  timezone: string;
  modality: keyof typeof modalityLabels;
  practiceArea: { name: string };
  lawyer: { displayName: string } | null;
};

function appointmentEmailDetails(appointment: AppointmentEmailContext) {
  return [
    { label: "Referencia", value: appointment.reference },
    {
      label: "Fecha",
      value: formatDateInTimeZone(appointment.startAt, appointment.timezone),
    },
    {
      label: "Hora",
      value: formatTimeInTimeZone(appointment.startAt, appointment.timezone),
    },
    { label: "Zona horaria", value: appointment.timezone },
    { label: "Modalidad", value: modalityLabels[appointment.modality] },
    { label: "Área", value: appointment.practiceArea.name },
    {
      label: "Profesional",
      value: appointment.lawyer?.displayName,
    },
  ];
}

async function notifyAppointmentCancellation(
  appointment: AppointmentEmailContext,
) {
  const details = appointmentEmailDetails(appointment);
  const clientEmail = renderTransactionalEmail({
    eyebrow: "Agenda",
    title: "Cita cancelada",
    greeting: `Hola ${appointment.fullName},`,
    paragraphs: [
      "La cita indicada a continuación fue cancelada conforme a la solicitud recibida.",
    ],
    details,
    action: {
      label: "Solicitar una nueva cita",
      url: new URL("/agendar", getSiteUrl()).toString(),
    },
  });
  const officeEmail = renderTransactionalEmail({
    eyebrow: "Agenda",
    title: `Cita cancelada ${appointment.reference}`,
    paragraphs: [
      `La cancelación fue solicitada por ${appointment.fullName} (${appointment.email}).`,
    ],
    details,
    action: {
      label: "Abrir panel de citas",
      url: new URL("/admin/citas", getSiteUrl()).toString(),
    },
  });
  await Promise.allSettled([
    sendTrackedEmail({
      to: appointment.email,
      subject: `Cita cancelada · ${appointment.reference}`,
      template: "appointment-cancelled-client",
      ...clientEmail,
      tags: ["appointment", "cancelled", "client"],
    }),
    sendTrackedEmail({
      to:
        process.env.CONTACT_RECIPIENT_EMAIL ||
        "r.lizarraga@lizarragaibarra.com",
      subject: `Cita cancelada · ${appointment.reference}`,
      template: "appointment-cancelled-office",
      ...officeEmail,
      replyTo: appointment.email,
      tags: ["appointment", "cancelled", "office"],
    }),
  ]);
}

async function notifyAppointmentReschedule(
  appointment: AppointmentEmailContext,
  requestedStartAt: Date,
) {
  const details = [
    ...appointmentEmailDetails(appointment),
    {
      label: "Nueva fecha solicitada",
      value: formatDateInTimeZone(requestedStartAt, appointment.timezone),
    },
    {
      label: "Nueva hora solicitada",
      value: formatTimeInTimeZone(requestedStartAt, appointment.timezone),
    },
  ];
  const clientEmail = renderTransactionalEmail({
    eyebrow: "Agenda",
    title: "Solicitud de reprogramación recibida",
    greeting: `Hola ${appointment.fullName},`,
    paragraphs: [
      "Registramos la nueva fecha solicitada. El equipo confirmará el cambio antes de considerarlo definitivo.",
    ],
    details,
  });
  const officeEmail = renderTransactionalEmail({
    eyebrow: "Agenda",
    title: `Reprogramación solicitada ${appointment.reference}`,
    paragraphs: [
      `${appointment.fullName} (${appointment.email}) solicitó una nueva fecha para su cita.`,
    ],
    details,
    action: {
      label: "Revisar solicitud",
      url: new URL("/admin/citas", getSiteUrl()).toString(),
    },
  });
  await Promise.allSettled([
    sendTrackedEmail({
      to: appointment.email,
      subject: `Reprogramación recibida · ${appointment.reference}`,
      template: "appointment-reschedule-client",
      ...clientEmail,
      tags: ["appointment", "reschedule", "client"],
    }),
    sendTrackedEmail({
      to:
        process.env.CONTACT_RECIPIENT_EMAIL ||
        "r.lizarraga@lizarragaibarra.com",
      subject: `Reprogramación solicitada · ${appointment.reference}`,
      template: "appointment-reschedule-office",
      ...officeEmail,
      replyTo: appointment.email,
      tags: ["appointment", "reschedule", "office"],
    }),
  ]);
}

export async function cancelAppointment(input: CancellationInput) {
  const appointment = await db.appointment.findUnique({
    where: {
      manageTokenHash: hashToken(input.token),
      manageTokenExpiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      reference: true,
      status: true,
      externalEventId: true,
      fullName: true,
      email: true,
      startAt: true,
      timezone: true,
      modality: true,
      lawyerId: true,
      durationMinutes: true,
      practiceArea: { select: { name: true } },
      lawyer: { select: { displayName: true } },
    },
  });
  if (!appointment)
    throw new ResourceNotFoundError("La liga de gestión no es válida.");
  if (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED
  ) {
    throw new ServiceError(
      "La cita ya no puede cancelarse.",
      409,
      "APPOINTMENT_NOT_CHANGEABLE",
    );
  }

  await db.$transaction([
    db.appointmentReservationSlot.deleteMany({
      where: { appointmentId: appointment.id },
    }),
    db.appointmentHold.deleteMany({
      where: { appointmentId: appointment.id },
    }),
    db.appointmentProposal.updateMany({
      where: { appointmentId: appointment.id, status: "PENDING" },
      data: { status: "REJECTED", respondedAt: new Date() },
    }),
    db.appointment.update({
      where: { id: appointment.id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        calendarSyncStatus: "PENDING",
        calendarSyncError: null,
        calendarSyncLockedAt: null,
        calendarSyncLockedBy: null,
        internalNotes: input.reason
          ? `Cancelación solicitada: ${input.reason}`
          : undefined,
      },
    }),
    db.appointmentChangeRequest.create({
      data: {
        appointmentId: appointment.id,
        type: "CANCEL",
        status: "APPROVED",
        reason: input.reason,
        resolvedAt: new Date(),
      },
    }),
  ]);

  await synchronizeAppointmentCalendar(appointment.id).catch(() => undefined);
  await notifyAppointmentCancellation(appointment);
  return { reference: appointment.reference };
}

export async function requestAppointmentReschedule(input: RescheduleInput) {
  const appointment = await db.appointment.findUnique({
    where: {
      manageTokenHash: hashToken(input.token),
      manageTokenExpiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      reference: true,
      status: true,
      timezone: true,
      fullName: true,
      email: true,
      startAt: true,
      modality: true,
      lawyerId: true,
      durationMinutes: true,
      practiceArea: { select: { name: true } },
      lawyer: { select: { displayName: true } },
    },
  });
  if (!appointment)
    throw new ResourceNotFoundError("La liga de gestión no es válida.");
  if (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED
  ) {
    throw new ServiceError(
      "La cita ya no puede reprogramarse.",
      409,
      "APPOINTMENT_NOT_CHANGEABLE",
    );
  }
  const availableSlots = await getAvailabilityDetails({
    date: input.date,
    lawyerId: appointment.lawyerId ?? undefined,
    modality: appointment.modality,
  });
  const selectedSlot = availableSlots.find((slot) => slot.label === input.time);
  if (!selectedSlot)
    throw new ServiceError(
      "El horario solicitado ya no está disponible.",
      409,
      "SLOT_CONFLICT",
    );
  const requestedStartAt = selectedSlot.startsAt;
  if (requestedStartAt <= new Date()) {
    throw new ServiceError(
      "La nueva fecha debe ser futura.",
      400,
      "INVALID_APPOINTMENT_DATE",
    );
  }

  const requestedEndAt = selectedSlot.endsAt;
  const holdMinutes = Math.min(
    120,
    Math.max(5, Number(process.env.APPOINTMENT_HOLD_MINUTES || 20)),
  );
  await db
    .$transaction(async (transaction) => {
      await transaction.appointmentHold.deleteMany({
        where: {
          OR: [
            { appointmentId: appointment.id },
            { status: "ACTIVE", expiresAt: { lte: new Date() } },
          ],
        },
      });
      await transaction.appointmentProposal.updateMany({
        where: { appointmentId: appointment.id, status: "PENDING" },
        data: { status: "SUPERSEDED", respondedAt: new Date() },
      });
      const proposal = await transaction.appointmentProposal.create({
        data: {
          appointmentId: appointment.id,
          proposerSide: "CLIENT",
          lawyerId: appointment.lawyerId,
          startAt: requestedStartAt,
          endAt: requestedEndAt,
          modality: appointment.modality,
          message: input.reason,
        },
      });
      await transaction.appointmentHold.create({
        data: {
          appointmentId: appointment.id,
          proposalId: proposal.id,
          lawyerId: appointment.lawyerId,
          resourceKey: reservationResourceKey(appointment.lawyerId),
          startsAt: requestedStartAt,
          endsAt: selectedSlot.occupiedUntil,
          expiresAt: new Date(Date.now() + holdMinutes * 60 * 1000),
        },
      });
      await transaction.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.PROPOSED_BY_CLIENT,
          proposedStartAt: requestedStartAt,
          proposedEndAt: requestedEndAt,
        },
      });
      await transaction.appointmentChangeRequest.create({
        data: {
          appointmentId: appointment.id,
          type: "RESCHEDULE",
          requestedStartAt,
          reason: input.reason,
        },
      });
    })
    .catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ServiceError(
          "El horario solicitado acaba de dejar de estar disponible.",
          409,
          "SLOT_CONFLICT",
        );
      }
      throw error;
    });
  await notifyAppointmentReschedule(appointment, requestedStartAt);
  return { reference: appointment.reference };
}
