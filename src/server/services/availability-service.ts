import type { AppointmentModality } from "@prisma/client";

import {
  addMinutes,
  DEFAULT_TIME_ZONE,
  generateAvailabilitySlots,
  getCalendarProvider,
  reservationResourceKey,
  weekdayForDate,
  zonedDateTimeToUtc,
  type AvailableSlot,
} from "@/lib/calendar";
import { db } from "@/lib/db";
import { ResourceNotFoundError } from "@/server/services/errors";
import {
  developmentAvailability,
  developmentMemoryEnabled,
} from "@/server/services/dev-memory";

export type AvailabilitySlotDetail = AvailableSlot & {
  durationMinutes: number;
  bufferMinutes: number;
  timezone: string;
  resourceKey: string;
  lawyerId?: string;
};

const FALLBACK_RULE = {
  startMinutes: 9 * 60,
  endMinutes: 18 * 60,
  durationMinutes: 45,
  bufferMinutes: 15,
  timezone: DEFAULT_TIME_ZONE,
  minimumNoticeMinutes: 1440,
  bookingHorizonDays: 60,
  modalities: [
    "IN_PERSON",
    "VIDEO_CALL",
    "PHONE_CALL",
  ] as AppointmentModality[],
  dailyLimit: null,
};

export async function getAvailabilityDetails(input: {
  date: string;
  lawyerId?: string;
  modality?: AppointmentModality;
  now?: Date;
}): Promise<AvailabilitySlotDetail[]> {
  const weekday = weekdayForDate(input.date);
  if (developmentMemoryEnabled()) return developmentAvailability(input);

  let resolvedLawyerId: string | undefined;
  if (input.lawyerId) {
    const lawyer = await db.lawyerProfile.findFirst({
      where: {
        active: true,
        OR: [{ id: input.lawyerId }, { slug: input.lawyerId }],
      },
      select: { id: true },
    });
    if (!lawyer)
      throw new ResourceNotFoundError(
        "El profesional seleccionado no está disponible.",
      );
    resolvedLawyerId = lawyer.id;
  }

  const requestedDate = new Date(`${input.date}T00:00:00.000Z`);
  const [rules, override] = await Promise.all([
    db.availabilityRule.findMany({
      where: {
        weekday,
        active: true,
        ...(input.modality ? { modalities: { has: input.modality } } : {}),
        OR: resolvedLawyerId
          ? [{ lawyerId: resolvedLawyerId }, { lawyerId: null }]
          : [{ lawyerId: null }],
      },
      orderBy: { startMinutes: "asc" },
    }),
    resolvedLawyerId
      ? db.lawyerAvailabilityOverride.findUnique({
          where: {
            lawyerId_date: { lawyerId: resolvedLawyerId, date: requestedDate },
          },
        })
      : null,
  ]);
  if (override && !override.available) return [];
  const specificRules = resolvedLawyerId
    ? rules.filter((rule) => rule.lawyerId === resolvedLawyerId)
    : [];
  const selectedRules =
    specificRules.length > 0
      ? specificRules
      : rules.filter((rule) => !rule.lawyerId);
  if (selectedRules.length === 0 && !override?.available) {
    return [];
  }
  const overrideRule =
    override?.available &&
    override.startMinutes != null &&
    override.endMinutes != null
      ? {
          ...FALLBACK_RULE,
          startMinutes: override.startMinutes,
          endMinutes: override.endMinutes,
          durationMinutes:
            override.durationMinutes ?? FALLBACK_RULE.durationMinutes,
          bufferMinutes: override.bufferMinutes ?? FALLBACK_RULE.bufferMinutes,
          timezone: selectedRules[0]?.timezone ?? DEFAULT_TIME_ZONE,
        }
      : null;
  const effectiveRules = overrideRule
    ? [overrideRule]
    : selectedRules.length > 0
      ? selectedRules
      : [];
  const timezone = effectiveRules[0]?.timezone ?? DEFAULT_TIME_ZONE;
  const dayStart = zonedDateTimeToUtc(input.date, "00:00", timezone);
  const queryEnd = addMinutes(dayStart, 27 * 60);
  const resourceKey = reservationResourceKey(resolvedLawyerId);

  const [blocked, reservations, holds, externalBusy, confirmedCount] =
    await Promise.all([
      db.blockedTime.findMany({
        where: {
          startsAt: { lt: queryEnd },
          endsAt: { gt: dayStart },
          OR: resolvedLawyerId
            ? [{ lawyerId: resolvedLawyerId }, { lawyerId: null }]
            : [{ lawyerId: null }],
        },
        select: { startsAt: true, endsAt: true },
      }),
      db.appointmentReservationSlot.findMany({
        where: {
          resourceKey,
          startsAt: { gte: dayStart, lt: queryEnd },
        },
        select: { startsAt: true },
      }),
      db.appointmentHold.findMany({
        where: {
          resourceKey,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
          startsAt: { lt: queryEnd },
          endsAt: { gt: dayStart },
        },
        select: { startsAt: true, endsAt: true },
      }),
      getCalendarProvider().getBusyIntervals(dayStart, queryEnd),
      resolvedLawyerId
        ? db.appointment.count({
            where: {
              lawyerId: resolvedLawyerId,
              status: "CONFIRMED",
              confirmedStartAt: { gte: dayStart, lt: queryEnd },
            },
          })
        : 0,
    ]);

  const busyIntervals = [
    ...blocked,
    ...externalBusy,
    ...holds,
    ...reservations.map(({ startsAt }) => ({
      startsAt,
      endsAt: addMinutes(startsAt, 15),
    })),
  ];
  const unique = new Map<string, AvailabilitySlotDetail>();

  for (const rule of effectiveRules) {
    if (rule.dailyLimit != null && confirmedCount >= rule.dailyLimit) continue;
    const generated = generateAvailabilitySlots({
      date: input.date,
      rule,
      busyIntervals,
      now: input.now,
    });
    for (const slot of generated) {
      const earliest = addMinutes(
        input.now ?? new Date(),
        rule.minimumNoticeMinutes,
      );
      const horizon = addMinutes(
        input.now ?? new Date(),
        rule.bookingHorizonDays * 24 * 60,
      );
      if (slot.startsAt < earliest || slot.startsAt > horizon) continue;
      unique.set(slot.label, {
        ...slot,
        durationMinutes: rule.durationMinutes,
        bufferMinutes: rule.bufferMinutes,
        timezone: rule.timezone,
        resourceKey,
        lawyerId: resolvedLawyerId,
      });
    }
  }

  return [...unique.values()].sort(
    (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
  );
}

export async function getAvailableSlotLabels(input: {
  date: string;
  lawyerId?: string;
  modality?: AppointmentModality;
  now?: Date;
}) {
  return (await getAvailabilityDetails(input)).map((slot) => slot.label);
}
