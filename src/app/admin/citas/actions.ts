"use server";

import { AppointmentStatus, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { sanitizeMultiline } from "@/lib/validation";
import { requireActor } from "@/server/policies";
import { synchronizeAppointmentCalendar } from "@/server/services/calendar-sync-service";

const actionSchema = z.object({
  appointmentId: z.string().cuid(),
});

const assignmentSchema = actionSchema.extend({
  lawyerId: z.string().cuid(),
});

const internalNotesSchema = actionSchema.extend({
  internalNotes: z
    .string()
    .max(8000)
    .transform(sanitizeMultiline)
    .pipe(z.string().max(4000)),
});

type AdminOperation = "cancel" | "reschedule";

function actionUrl(parameter: "notice" | "error", value: string) {
  return `/admin/citas?${parameter}=${encodeURIComponent(value)}`;
}

function isExpectedStateError(error: unknown) {
  return error instanceof AdminAppointmentStateError;
}

class AdminAppointmentStateError extends Error {}

async function loadMutableAppointment(
  transaction: Prisma.TransactionClient,
  appointmentId: string,
) {
  const appointment = await transaction.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      reference: true,
      status: true,
      externalEventId: true,
      calendarSyncStatus: true,
      lawyerId: true,
      internalNotes: true,
      reservationSlots: { select: { startsAt: true } },
      holds: {
        where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
        select: { id: true, startsAt: true, endsAt: true },
      },
    },
  });
  if (!appointment) throw new AdminAppointmentStateError("not-found");
  return appointment;
}

async function cancelAppointment(appointmentId: string, actorId: string) {
  const appointment = await db.$transaction(async (transaction) => {
    const current = await loadMutableAppointment(transaction, appointmentId);
    if (
      current.status === AppointmentStatus.CANCELLED ||
      current.status === AppointmentStatus.COMPLETED ||
      current.status === AppointmentStatus.NO_SHOW
    ) {
      throw new AdminAppointmentStateError("not-cancellable");
    }
    await transaction.appointmentReservationSlot.deleteMany({
      where: { appointmentId: current.id },
    });
    await transaction.appointmentHold.deleteMany({
      where: { appointmentId: current.id },
    });
    await transaction.appointmentProposal.updateMany({
      where: { appointmentId: current.id, status: "PENDING" },
      data: { status: "REJECTED", respondedAt: new Date() },
    });
    const updated = await transaction.appointment.updateMany({
      where: {
        id: current.id,
        status: {
          notIn: [
            AppointmentStatus.CANCELLED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
          ],
        },
      },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        calendarSyncStatus: "PENDING",
        calendarSyncError: null,
        calendarSyncLockedAt: null,
        calendarSyncLockedBy: null,
      },
    });
    if (updated.count !== 1)
      throw new AdminAppointmentStateError("concurrent-update");
    await transaction.appointmentChangeRequest.create({
      data: {
        appointmentId: current.id,
        type: "CANCEL",
        status: "APPROVED",
        reason: "Cancelación registrada por administración.",
        resolvedAt: new Date(),
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId,
        action: "ADMIN_APPOINTMENT_CANCELLED",
        entityType: "Appointment",
        entityId: current.id,
        metadata: {
          reference: current.reference,
          previousStatus: current.status,
        },
      },
    });
    return current;
  });

  try {
    await synchronizeAppointmentCalendar(appointment.id);
  } catch {
    await db.auditLog.create({
      data: {
        actorId,
        action: "ADMIN_APPOINTMENT_CALENDAR_CANCEL_FAILED",
        entityType: "Appointment",
        entityId: appointment.id,
        metadata: { reference: appointment.reference },
      },
    });
  }
}

async function markAppointmentForReschedule(
  appointmentId: string,
  actorId: string,
) {
  await db.$transaction(async (transaction) => {
    const appointment = await loadMutableAppointment(
      transaction,
      appointmentId,
    );
    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.NO_SHOW ||
      appointment.status === AppointmentStatus.RESCHEDULE_REQUESTED
    ) {
      throw new AdminAppointmentStateError("not-reschedulable");
    }
    const updated = await transaction.appointment.updateMany({
      where: {
        id: appointment.id,
        status: {
          notIn: [
            AppointmentStatus.CANCELLED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
            AppointmentStatus.RESCHEDULE_REQUESTED,
          ],
        },
      },
      data: { status: AppointmentStatus.RESCHEDULE_REQUESTED },
    });
    if (updated.count !== 1)
      throw new AdminAppointmentStateError("concurrent-update");
    await transaction.appointmentChangeRequest.create({
      data: {
        appointmentId: appointment.id,
        type: "RESCHEDULE",
        reason: "Reprogramación marcada por administración.",
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId,
        action: "ADMIN_APPOINTMENT_RESCHEDULE_REQUESTED",
        entityType: "Appointment",
        entityId: appointment.id,
        metadata: {
          reference: appointment.reference,
          previousStatus: appointment.status,
        },
      },
    });
  });
}

async function assignAppointmentLawyer(
  appointmentId: string,
  lawyerId: string,
  actorId: string,
) {
  try {
    await db.$transaction(async (transaction) => {
      const [appointment, lawyer] = await Promise.all([
        loadMutableAppointment(transaction, appointmentId),
        transaction.lawyerProfile.findFirst({
          where: { id: lawyerId, active: true },
          select: { id: true },
        }),
      ]);
      if (!lawyer) throw new AdminAppointmentStateError("inactive-lawyer");
      if (
        (
          [
            AppointmentStatus.CANCELLED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
            AppointmentStatus.DECLINED,
          ] as AppointmentStatus[]
        ).includes(appointment.status)
      ) {
        throw new AdminAppointmentStateError("closed-appointment");
      }

      for (const hold of appointment.holds) {
        const collision = await transaction.appointmentHold.findFirst({
          where: {
            appointmentId: { not: appointment.id },
            resourceKey: `lawyer:${lawyer.id}`,
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
            startsAt: { lt: hold.endsAt },
            endsAt: { gt: hold.startsAt },
          },
          select: { id: true },
        });
        if (collision) {
          throw new AdminAppointmentStateError("lawyer-not-available");
        }
      }

      if (appointment.reservationSlots.length > 0) {
        await transaction.appointmentReservationSlot.deleteMany({
          where: { appointmentId: appointment.id },
        });
        await transaction.appointmentReservationSlot.createMany({
          data: appointment.reservationSlots.map(({ startsAt }) => ({
            appointmentId: appointment.id,
            resourceKey: `lawyer:${lawyer.id}`,
            startsAt,
          })),
        });
      }
      await transaction.appointmentHold.updateMany({
        where: { appointmentId: appointment.id, status: "ACTIVE" },
        data: {
          lawyerId: lawyer.id,
          resourceKey: `lawyer:${lawyer.id}`,
        },
      });
      await transaction.appointmentProposal.updateMany({
        where: { appointmentId: appointment.id, status: "PENDING" },
        data: { lawyerId: lawyer.id },
      });
      await transaction.appointment.update({
        where: { id: appointment.id },
        data: { lawyerId: lawyer.id },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "ADMIN_APPOINTMENT_LAWYER_ASSIGNED",
          entityType: "Appointment",
          entityId: appointment.id,
          metadata: {
            reference: appointment.reference,
            previousLawyerId: appointment.lawyerId,
            lawyerId: lawyer.id,
            changed: appointment.lawyerId !== lawyer.id,
          },
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AdminAppointmentStateError("lawyer-not-available");
    }
    throw error;
  }
}

async function saveAppointmentInternalNotes(
  appointmentId: string,
  internalNotes: string,
  actorId: string,
) {
  await db.$transaction(async (transaction) => {
    const appointment = await loadMutableAppointment(
      transaction,
      appointmentId,
    );
    await transaction.appointment.update({
      where: { id: appointment.id },
      data: { internalNotes: internalNotes || null },
    });
    await transaction.auditLog.create({
      data: {
        actorId,
        action: "ADMIN_APPOINTMENT_INTERNAL_NOTES_UPDATED",
        entityType: "Appointment",
        entityId: appointment.id,
        metadata: {
          reference: appointment.reference,
          hadPreviousNotes: Boolean(appointment.internalNotes),
          cleared: internalNotes.length === 0,
          characterCount: internalNotes.length,
        },
      },
    });
  });
}

async function runAdminAppointmentAction(
  formData: FormData,
  operation: AdminOperation,
) {
  const parsed = actionSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
  });
  if (!parsed.success) redirect(actionUrl("error", "invalid"));

  try {
    const actor = await requireActor(["ADMIN"]);
    if (operation === "cancel")
      await cancelAppointment(parsed.data.appointmentId, actor.id);
    if (operation === "reschedule")
      await markAppointmentForReschedule(parsed.data.appointmentId, actor.id);
  } catch (error) {
    redirect(
      actionUrl(
        "error",
        isExpectedStateError(error) ? "unavailable" : "failed",
      ),
    );
  }

  revalidatePath("/admin/citas");
  redirect(
    actionUrl("notice", operation === "cancel" ? "cancelled" : "reschedule"),
  );
}

export async function cancelAppointmentAction(formData: FormData) {
  await runAdminAppointmentAction(formData, "cancel");
}

export async function markAppointmentForRescheduleAction(formData: FormData) {
  await runAdminAppointmentAction(formData, "reschedule");
}

export async function assignAppointmentLawyerAction(formData: FormData) {
  const parsed = assignmentSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    lawyerId: formData.get("lawyerId"),
  });
  if (!parsed.success) redirect(actionUrl("error", "invalid"));

  try {
    const actor = await requireActor(["ADMIN"]);
    await assignAppointmentLawyer(
      parsed.data.appointmentId,
      parsed.data.lawyerId,
      actor.id,
    );
  } catch (error) {
    redirect(
      actionUrl(
        "error",
        isExpectedStateError(error) ? "unavailable" : "failed",
      ),
    );
  }
  revalidatePath("/admin/citas");
  redirect(actionUrl("notice", "assigned"));
}

export async function saveAppointmentInternalNotesAction(formData: FormData) {
  const parsed = internalNotesSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    internalNotes: formData.get("internalNotes"),
  });
  if (!parsed.success) redirect(actionUrl("error", "invalid-notes"));

  try {
    const actor = await requireActor(["ADMIN"]);
    await saveAppointmentInternalNotes(
      parsed.data.appointmentId,
      parsed.data.internalNotes,
      actor.id,
    );
  } catch (error) {
    redirect(
      actionUrl(
        "error",
        isExpectedStateError(error) ? "unavailable" : "failed",
      ),
    );
  }
  revalidatePath("/admin/citas");
  redirect(actionUrl("notice", "notes"));
}
