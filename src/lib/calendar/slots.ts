import {
  addMinutes,
  DEFAULT_TIME_ZONE,
  minutesToTime,
  zonedDateTimeToUtc,
} from "@/lib/calendar/dates";

export type BusyInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type AvailabilityRuleInput = {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  bufferMinutes: number;
  timezone?: string;
};

export type AvailableSlot = {
  label: string;
  startsAt: Date;
  endsAt: Date;
  occupiedUntil: Date;
};

export function intervalsOverlap(left: BusyInterval, right: BusyInterval) {
  return left.startsAt < right.endsAt && right.startsAt < left.endsAt;
}

export function generateAvailabilitySlots(input: {
  date: string;
  rule: AvailabilityRuleInput;
  busyIntervals?: BusyInterval[];
  now?: Date;
}) {
  const { date, rule } = input;
  const busyIntervals = input.busyIntervals ?? [];
  const now = input.now ?? new Date();
  const timezone = rule.timezone ?? DEFAULT_TIME_ZONE;
  const step = rule.durationMinutes + rule.bufferMinutes;
  const slots: AvailableSlot[] = [];

  if (
    step <= 0 ||
    rule.durationMinutes <= 0 ||
    rule.startMinutes >= rule.endMinutes
  ) {
    return slots;
  }

  for (
    let startMinutes = rule.startMinutes;
    startMinutes + rule.durationMinutes <= rule.endMinutes;
    startMinutes += step
  ) {
    const startsAt = zonedDateTimeToUtc(
      date,
      minutesToTime(startMinutes),
      timezone,
    );
    const endsAt = addMinutes(startsAt, rule.durationMinutes);
    const occupiedUntil = addMinutes(endsAt, rule.bufferMinutes);
    const candidate = { startsAt, endsAt: occupiedUntil };
    if (startsAt <= now) continue;
    if (busyIntervals.some((busy) => intervalsOverlap(candidate, busy)))
      continue;
    slots.push({
      label: minutesToTime(startMinutes),
      startsAt,
      endsAt,
      occupiedUntil,
    });
  }

  return slots;
}

export function reservationSlotStarts(
  startsAt: Date,
  durationMinutes: number,
  bufferMinutes: number,
  quantumMinutes = 15,
) {
  const occupiedMinutes = durationMinutes + bufferMinutes;
  if (occupiedMinutes <= 0 || quantumMinutes <= 0) return [];
  const count = Math.ceil(occupiedMinutes / quantumMinutes);
  return Array.from({ length: count }, (_, index) =>
    addMinutes(startsAt, index * quantumMinutes),
  );
}

export function reservationResourceKey(lawyerId?: string | null) {
  return lawyerId ? `lawyer:${lawyerId}` : "firm:intake";
}

export function reservationKey(resourceKey: string, startsAt: Date) {
  return `${resourceKey}:${startsAt.toISOString()}`;
}

export function hasReservationCollision(
  existingKeys: Iterable<string>,
  candidateKeys: Iterable<string>,
) {
  const occupied = new Set(existingKeys);
  for (const candidate of candidateKeys) {
    if (occupied.has(candidate)) return true;
  }
  return false;
}
