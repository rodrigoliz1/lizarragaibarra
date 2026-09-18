import { getCalendarProvider } from "@/lib/calendar";
import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";

export async function synchronizeAppointmentCalendar(appointmentId: string) {
  const workerId = randomUUID();
  const now = new Date();
  const lockTimeoutMs = Math.max(
    30_000,
    Math.min(
      30 * 60 * 1000,
      Number(process.env.CALENDAR_SYNC_LOCK_TIMEOUT_MS || 120_000),
    ),
  );
  const maxAttempts = Math.max(
    1,
    Math.min(20, Number(process.env.CALENDAR_SYNC_MAX_ATTEMPTS || 8)),
  );
  const claimed = await db.appointment.updateMany({
    where: {
      id: appointmentId,
      calendarSyncStatus: { in: ["PENDING", "FAILED"] },
      calendarSyncAttempts: { lt: maxAttempts },
      OR: [
        { calendarSyncLockedAt: null },
        {
          calendarSyncLockedAt: {
            lte: new Date(now.getTime() - lockTimeoutMs),
          },
        },
      ],
    },
    data: {
      calendarSyncLockedAt: now,
      calendarSyncLockedBy: workerId,
      calendarSyncAttempts: { increment: 1 },
    },
  });
  if (claimed.count !== 1) return { synced: false, provider: "skipped" };

  const appointment = await db.appointment.findFirstOrThrow({
    where: { id: appointmentId, calendarSyncLockedBy: workerId },
    select: {
      id: true,
      reference: true,
      status: true,
      startAt: true,
      endAt: true,
      timezone: true,
      modality: true,
      fullName: true,
      email: true,
      externalEventId: true,
      practiceArea: { select: { name: true } },
    },
  });
  const provider = getCalendarProvider();
  if (provider.name === "mock") {
    await db.appointment.updateMany({
      where: { id: appointmentId, calendarSyncLockedBy: workerId },
      data: {
        calendarSyncStatus: "NOT_REQUIRED",
        calendarSyncError: null,
        calendarSyncLockedAt: null,
        calendarSyncLockedBy: null,
      },
    });
    return { synced: false, provider: provider.name };
  }
  try {
    if (appointment.status === "CANCELLED") {
      if (appointment.externalEventId) {
        await provider.cancelEvent(appointment.externalEventId);
      }
      await db.appointment.updateMany({
        where: { id: appointmentId, calendarSyncLockedBy: workerId },
        data: {
          calendarSyncStatus: "SYNCED",
          calendarSyncError: null,
          calendarSyncLockedAt: null,
          calendarSyncLockedBy: null,
        },
      });
      return { synced: true, provider: provider.name };
    }
    if (appointment.status !== "CONFIRMED") {
      await db.appointment.updateMany({
        where: { id: appointmentId, calendarSyncLockedBy: workerId },
        data: {
          calendarSyncStatus: "NOT_REQUIRED",
          calendarSyncLockedAt: null,
          calendarSyncLockedBy: null,
        },
      });
      return { synced: false, provider: provider.name };
    }
    const input = {
      reference: appointment.reference,
      startsAt: appointment.startAt,
      endsAt: appointment.endAt,
      timezone: appointment.timezone,
      modality: appointment.modality,
      attendeeName: appointment.fullName,
      attendeeEmail: appointment.email,
      practiceAreaName: appointment.practiceArea.name,
    };
    const event = appointment.externalEventId
      ? await provider.updateEvent(appointment.externalEventId, input)
      : await provider.createEvent(input);
    await db.appointment.updateMany({
      where: { id: appointmentId, calendarSyncLockedBy: workerId },
      data: {
        externalEventId: event.externalEventId,
        calendarSyncStatus: "SYNCED",
        calendarSyncError: null,
        calendarSyncLockedAt: null,
        calendarSyncLockedBy: null,
      },
    });
    return { synced: true, provider: provider.name };
  } catch (error) {
    await db.appointment.updateMany({
      where: { id: appointmentId, calendarSyncLockedBy: workerId },
      data: {
        calendarSyncStatus: "FAILED",
        calendarSyncError:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "No fue posible sincronizar el calendario.",
        calendarSyncLockedAt: null,
        calendarSyncLockedBy: null,
      },
    });
    throw error;
  }
}

export async function processPendingCalendarSync(batchSize = 20) {
  const maxAttempts = Math.max(
    1,
    Math.min(20, Number(process.env.CALENDAR_SYNC_MAX_ATTEMPTS || 8)),
  );
  const appointments = await db.appointment.findMany({
    where: {
      calendarSyncStatus: { in: ["PENDING", "FAILED"] },
      status: { in: ["CONFIRMED", "CANCELLED"] },
      calendarSyncAttempts: { lt: maxAttempts },
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: Math.max(1, Math.min(100, batchSize)),
  });
  const results = await Promise.allSettled(
    appointments.map(({ id }) => synchronizeAppointmentCalendar(id)),
  );
  return {
    processed: results.length,
    succeeded: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}
