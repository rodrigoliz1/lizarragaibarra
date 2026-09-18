import {
  AppointmentModality,
  AppointmentStatus,
  CalendarSyncStatus,
  Prisma,
} from "@prisma/client";

import { formatDateInTimeZone, formatTimeInTimeZone } from "@/lib/calendar";
import { db } from "@/lib/db";
import { renderTransactionalEmail, sendTrackedEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import {
  createPublicReference,
  createSecureToken,
} from "@/lib/security/tokens";
import type { AppointmentInput } from "@/lib/validation";
import { trackServerEvent } from "@/lib/analytics";
import { getAvailabilityDetails } from "@/server/services/availability-service";
import {
  ReservationConflictError,
  ResourceNotFoundError,
} from "@/server/services/errors";
import {
  createDevelopmentAppointment,
  developmentMemoryEnabled,
} from "@/server/services/dev-memory";

const modalityMap = {
  PRESENCIAL: AppointmentModality.IN_PERSON,
  VIDEOLLAMADA: AppointmentModality.VIDEO_CALL,
  TELEFONICA: AppointmentModality.PHONE_CALL,
} as const;

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createAppointment(
  input: AppointmentInput,
  context?: {
    actorId: string;
    clientProfileId: string;
    matterId: string;
  },
) {
  if (developmentMemoryEnabled()) {
    const result = createDevelopmentAppointment(input);
    trackServerEvent("appointment_requested", {
      modality: input.modality,
      assignedProfessional: Boolean(input.lawyerId),
      provider: "development-memory",
    });
    return { reference: result.reference, status: AppointmentStatus.REQUESTED };
  }
  const [practiceArea, availability, clientProfile] = await Promise.all([
    db.practiceArea.findFirst({
      where: { slug: input.practiceArea, active: true },
      select: { id: true, name: true },
    }),
    getAvailabilityDetails({
      date: input.date,
      lawyerId: input.lawyerId,
      modality: modalityMap[input.modality],
    }),
    context
      ? db.clientProfile.findUnique({
          where: { id: context.clientProfileId },
          select: { id: true },
        })
      : null,
  ]);
  if (!practiceArea)
    throw new ResourceNotFoundError(
      "El área de práctica seleccionada no existe.",
    );
  const selectedSlot = availability.find((slot) => slot.label === input.time);
  if (!selectedSlot) throw new ReservationConflictError();

  const reference = createPublicReference("CITA");
  const { token: manageToken, tokenHash: manageTokenHash } =
    createSecureToken();
  let appointment: { id: string; reference: string };
  try {
    appointment = await db.$transaction(async (transaction) => {
      await transaction.appointmentHold.deleteMany({
        where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
      });
      const created = await transaction.appointment.create({
        data: {
          reference,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          company: input.company,
          clientId: context?.clientProfileId ?? clientProfile?.id,
          matterId: context?.matterId,
          practiceAreaId: practiceArea.id,
          lawyerId: selectedSlot.lawyerId,
          modality: modalityMap[input.modality],
          startAt: selectedSlot.startsAt,
          endAt: selectedSlot.endsAt,
          proposedStartAt: selectedSlot.startsAt,
          proposedEndAt: selectedSlot.endsAt,
          durationMinutes: selectedSlot.durationMinutes,
          timezone: selectedSlot.timezone,
          description: input.description,
          privacyAcceptedAt: new Date(),
          manageTokenHash,
          manageTokenExpiresAt: new Date(
            Date.now() +
              Math.max(
                1,
                Math.min(
                  90,
                  Number(process.env.APPOINTMENT_MANAGE_TOKEN_TTL_DAYS || 30),
                ),
              ) *
                24 *
                60 *
                60 *
                1000,
          ),
          status: AppointmentStatus.LAWYER_REVIEW,
          createdById: context?.actorId,
          lastActorId: context?.actorId,
          calendarSyncStatus: CalendarSyncStatus.NOT_REQUIRED,
        },
        select: { id: true, reference: true },
      });
      const proposal = await transaction.appointmentProposal.create({
        data: {
          appointmentId: created.id,
          proposerSide: "CLIENT",
          lawyerId: selectedSlot.lawyerId,
          startAt: selectedSlot.startsAt,
          endAt: selectedSlot.endsAt,
          modality: modalityMap[input.modality],
          message: "Horario solicitado desde la agenda pública.",
        },
        select: { id: true },
      });
      const holdMinutes = Math.min(
        120,
        Math.max(5, Number(process.env.APPOINTMENT_HOLD_MINUTES || 20)),
      );
      await transaction.appointmentHold.create({
        data: {
          appointmentId: created.id,
          proposalId: proposal.id,
          lawyerId: selectedSlot.lawyerId,
          resourceKey: selectedSlot.resourceKey,
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.occupiedUntil,
          expiresAt: new Date(Date.now() + holdMinutes * 60 * 1000),
        },
      });
      return created;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new ReservationConflictError();
    throw error;
  }

  const status: AppointmentStatus = AppointmentStatus.LAWYER_REVIEW;

  const siteUrl = getSiteUrl();
  const manageUrl = new URL("/agendar", siteUrl);
  manageUrl.searchParams.set("gestionar", manageToken);
  const localDate = formatDateInTimeZone(
    selectedSlot.startsAt,
    selectedSlot.timezone,
  );
  const localTime = formatTimeInTimeZone(
    selectedSlot.startsAt,
    selectedSlot.timezone,
  );
  const lawyer = selectedSlot.lawyerId
    ? await db.lawyerProfile.findUnique({
        where: { id: selectedSlot.lawyerId },
        select: { displayName: true },
      })
    : null;
  const modalityLabel = {
    PRESENCIAL: "Presencial",
    VIDEOLLAMADA: "Videollamada",
    TELEFONICA: "Llamada telefónica",
  }[input.modality];
  const commonDetails = [
    { label: "Referencia", value: reference },
    { label: "Fecha", value: localDate },
    { label: "Hora", value: localTime },
    { label: "Zona horaria", value: selectedSlot.timezone },
    { label: "Modalidad", value: modalityLabel },
    { label: "Área", value: practiceArea.name },
    { label: "Profesional solicitado", value: lawyer?.displayName },
  ];
  const clientEmail = renderTransactionalEmail({
    eyebrow: "Agenda",
    title: "Solicitud de cita recibida",
    greeting: `Hola ${input.fullName},`,
    paragraphs: [
      "Registramos su solicitud. El horario aún no está confirmado; el profesional podrá aceptarlo o proponer una alternativa.",
    ],
    details: commonDetails,
    action: { label: "Gestionar solicitud", url: manageUrl.toString() },
  });
  const officeEmail = renderTransactionalEmail({
    eyebrow: "Nueva solicitud",
    title: `Nueva cita ${reference}`,
    paragraphs: [
      "Se registró una nueva solicitud de cita en el sistema.",
      `Contacto: ${input.fullName} · ${input.email} · ${input.phone}`,
      `Descripción breve: ${input.description}`,
    ],
    details: commonDetails,
    action: {
      label: "Abrir panel administrativo",
      url: new URL("/admin/citas", siteUrl).toString(),
    },
  });
  const officeRecipient =
    process.env.CONTACT_RECIPIENT_EMAIL || "r.lizarraga@lizarragaibarra.com";

  await Promise.allSettled([
    sendTrackedEmail({
      to: input.email,
      subject: `Solicitud de cita recibida · ${reference}`,
      template: "appointment-client",
      ...clientEmail,
      tags: ["appointment", "client"],
      metadata: { "X-LI-Reference": reference },
    }),
    sendTrackedEmail({
      to: officeRecipient,
      subject: `Nueva solicitud de cita · ${reference}`,
      template: "appointment-office",
      ...officeEmail,
      replyTo: input.email,
      tags: ["appointment", "office"],
      metadata: { "X-LI-Reference": reference },
    }),
  ]);

  await db.auditLog.create({
    data: {
      action: "APPOINTMENT_CREATED",
      entityType: "Appointment",
      entityId: appointment.id,
      metadata: { reference, status },
    },
  });
  trackServerEvent("appointment_requested", {
    modality: input.modality,
    assignedProfessional: Boolean(input.lawyerId),
  });

  return { id: appointment.id, reference, status };
}
