"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DEFAULT_TIME_ZONE,
  isCalendarDate,
  isTimeString,
  zonedDateTimeToUtc,
} from "@/lib/calendar";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

const GLOBAL_WEEKDAYS = [1, 2, 3, 4, 5] as const;

const timeField = z
  .string()
  .trim()
  .refine(isTimeString, "La hora no es válida.");

function integerField(minimum: number, maximum: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN,
    z.number().int().min(minimum).max(maximum),
  );
}

const scheduleSchema = z
  .object({
    startTime: timeField,
    endTime: timeField,
    durationMinutes: integerField(15, 240),
    bufferMinutes: integerField(0, 120),
  })
  .superRefine((value, context) => {
    const startMinutes = timeToMinutes(value.startTime);
    const endMinutes = timeToMinutes(value.endTime);
    if (endMinutes <= startMinutes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "La hora final debe ser posterior a la inicial.",
      });
    }
    if (value.durationMinutes > endMinutes - startMinutes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationMinutes"],
        message: "La duración debe caber dentro de la jornada.",
      });
    }
  });

const blockedTimeSchema = z
  .object({
    date: z.string().trim().refine(isCalendarDate, "La fecha no es válida."),
    startTime: timeField,
    endTime: timeField,
    reason: z
      .string()
      .trim()
      .max(180)
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (timeToMinutes(value.endTime) <= timeToMinutes(value.startTime)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "La hora final debe ser posterior a la inicial.",
      });
    }
  });

const deleteBlockedTimeSchema = z.object({
  blockedTimeId: z.string().cuid(),
});

type AvailabilityErrorCode = "overlap" | "not-found" | "past";

class AvailabilityStateError extends Error {
  constructor(readonly code: AvailabilityErrorCode) {
    super(code);
  }
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function actionUrl(parameter: "notice" | "error", value: string) {
  return `/admin/disponibilidad?${parameter}=${encodeURIComponent(value)}`;
}

function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function redirectForFailure(error: unknown) {
  if (error instanceof AvailabilityStateError) {
    redirect(actionUrl("error", error.code));
  }
  redirect(actionUrl("error", "failed"));
}

export async function saveGlobalAvailabilityAction(formData: FormData) {
  const parsed = scheduleSchema.safeParse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    durationMinutes: formData.get("durationMinutes"),
    bufferMinutes: formData.get("bufferMinutes"),
  });
  if (!parsed.success) redirect(actionUrl("error", "invalid-schedule"));
  if (!databaseConfigured()) redirect(actionUrl("error", "database"));

  const nextSchedule = {
    startMinutes: timeToMinutes(parsed.data.startTime),
    endMinutes: timeToMinutes(parsed.data.endTime),
    durationMinutes: parsed.data.durationMinutes,
    bufferMinutes: parsed.data.bufferMinutes,
    timezone: DEFAULT_TIME_ZONE,
  };

  try {
    const actor = await requireActor(["ADMIN"]);
    await db.$transaction(async (transaction) => {
      const previousRules = await transaction.availabilityRule.findMany({
        where: {
          lawyerId: null,
          weekday: { in: [...GLOBAL_WEEKDAYS] },
        },
        orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }],
        select: {
          id: true,
          weekday: true,
          startMinutes: true,
          endMinutes: true,
          durationMinutes: true,
          bufferMinutes: true,
          timezone: true,
          active: true,
        },
      });

      await transaction.availabilityRule.deleteMany({
        where: {
          lawyerId: null,
          weekday: { in: [...GLOBAL_WEEKDAYS] },
        },
      });
      await transaction.availabilityRule.createMany({
        data: GLOBAL_WEEKDAYS.map((weekday) => ({
          lawyerId: null,
          weekday,
          ...nextSchedule,
          active: true,
        })),
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "ADMIN_GLOBAL_AVAILABILITY_UPDATED",
          entityType: "AvailabilityRule",
          entityId: "global-weekdays",
          metadata: {
            previousRules,
            nextSchedule: {
              weekdays: [...GLOBAL_WEEKDAYS],
              ...nextSchedule,
            },
          },
        },
      });
    });
  } catch (error) {
    redirectForFailure(error);
  }

  revalidatePath("/admin/disponibilidad");
  revalidatePath("/agendar");
  redirect(actionUrl("notice", "schedule-saved"));
}

export async function createGlobalBlockedTimeAction(formData: FormData) {
  const parsed = blockedTimeSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect(actionUrl("error", "invalid-block"));
  if (!databaseConfigured()) redirect(actionUrl("error", "database"));

  const startsAt = zonedDateTimeToUtc(
    parsed.data.date,
    parsed.data.startTime,
    DEFAULT_TIME_ZONE,
  );
  const endsAt = zonedDateTimeToUtc(
    parsed.data.date,
    parsed.data.endTime,
    DEFAULT_TIME_ZONE,
  );
  if (endsAt.getTime() <= Date.now()) {
    redirect(actionUrl("error", "past"));
  }

  try {
    const actor = await requireActor(["ADMIN"]);
    await db.$transaction(async (transaction) => {
      const overlap = await transaction.blockedTime.findFirst({
        where: {
          lawyerId: null,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      if (overlap) throw new AvailabilityStateError("overlap");

      const blockedTime = await transaction.blockedTime.create({
        data: {
          lawyerId: null,
          startsAt,
          endsAt,
          reason: parsed.data.reason,
        },
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "ADMIN_GLOBAL_BLOCKED_TIME_CREATED",
          entityType: "BlockedTime",
          entityId: blockedTime.id,
          metadata: {
            scope: "global",
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            reason: parsed.data.reason,
            timezone: DEFAULT_TIME_ZONE,
          },
        },
      });
    });
  } catch (error) {
    redirectForFailure(error);
  }

  revalidatePath("/admin/disponibilidad");
  revalidatePath("/agendar");
  redirect(actionUrl("notice", "block-created"));
}

export async function deleteGlobalBlockedTimeAction(formData: FormData) {
  const parsed = deleteBlockedTimeSchema.safeParse({
    blockedTimeId: formData.get("blockedTimeId"),
  });
  if (!parsed.success) redirect(actionUrl("error", "invalid-block"));
  if (!databaseConfigured()) redirect(actionUrl("error", "database"));

  try {
    const actor = await requireActor(["ADMIN"]);
    await db.$transaction(async (transaction) => {
      const blockedTime = await transaction.blockedTime.findFirst({
        where: { id: parsed.data.blockedTimeId, lawyerId: null },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          reason: true,
        },
      });
      if (!blockedTime) throw new AvailabilityStateError("not-found");

      const deleted = await transaction.blockedTime.deleteMany({
        where: { id: blockedTime.id, lawyerId: null },
      });
      if (deleted.count !== 1) throw new AvailabilityStateError("not-found");

      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "ADMIN_GLOBAL_BLOCKED_TIME_DELETED",
          entityType: "BlockedTime",
          entityId: blockedTime.id,
          metadata: {
            scope: "global",
            startsAt: blockedTime.startsAt.toISOString(),
            endsAt: blockedTime.endsAt.toISOString(),
            reason: blockedTime.reason,
            timezone: DEFAULT_TIME_ZONE,
          },
        },
      });
    });
  } catch (error) {
    redirectForFailure(error);
  }

  revalidatePath("/admin/disponibilidad");
  revalidatePath("/agendar");
  redirect(actionUrl("notice", "block-deleted"));
}
