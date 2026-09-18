export const DEFAULT_TIME_ZONE = "America/Mexico_City";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

type CalendarParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  const existing = formatters.get(timeZone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatters.set(timeZone, formatter);
  return formatter;
}

function partsInTimeZone(date: Date, timeZone: string): CalendarParts {
  const values: Record<string, number> = {};
  for (const part of getFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export function isCalendarDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function isTimeString(value: string) {
  const match = TIME_PATTERN.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function zonedDateTimeToUtc(
  date: string,
  time: string,
  timeZone = DEFAULT_TIME_ZONE,
) {
  if (!isCalendarDate(date) || !isTimeString(time)) {
    throw new RangeError("Fecha u hora inválida.");
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const intendedUtcValue = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let candidate = intendedUtcValue;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const observed = partsInTimeZone(new Date(candidate), timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    const difference = observedAsUtc - intendedUtcValue;
    if (difference === 0) break;
    candidate -= difference;
  }

  const result = new Date(candidate);
  const verified = partsInTimeZone(result, timeZone);
  if (
    verified.year !== year ||
    verified.month !== month ||
    verified.day !== day ||
    verified.hour !== hour ||
    verified.minute !== minute
  ) {
    throw new RangeError(
      "La hora local no existe en la zona horaria seleccionada.",
    );
  }
  return result;
}

export function formatDateInTimeZone(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = partsInTimeZone(date, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function formatTimeInTimeZone(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = partsInTimeZone(date, timeZone);
  return `${parts.hour.toString().padStart(2, "0")}:${parts.minute
    .toString()
    .padStart(2, "0")}`;
}

export function isPastZonedDateTime(
  date: string,
  time: string,
  timeZone = DEFAULT_TIME_ZONE,
  now = new Date(),
) {
  try {
    return zonedDateTimeToUtc(date, time, timeZone).getTime() <= now.getTime();
  } catch {
    return true;
  }
}

export function weekdayForDate(date: string) {
  if (!isCalendarDate(date)) throw new RangeError("Fecha inválida.");
  return new Date(`${date}T12:00:00.000Z`).getUTCDay();
}

export function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}
