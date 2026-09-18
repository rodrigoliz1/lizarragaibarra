import { describe, expect, it } from "vitest";

import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  isCalendarDate,
  isTimeString,
  weekdayForDate,
  zonedDateTimeToUtc,
} from "@/lib/calendar/dates";

describe("utilidades de fecha", () => {
  it("convierte una hora de Ciudad de México a UTC y puede revertirla", () => {
    const value = zonedDateTimeToUtc(
      "2026-01-15",
      "09:00",
      "America/Mexico_City",
    );
    expect(value.toISOString()).toBe("2026-01-15T15:00:00.000Z");
    expect(formatDateInTimeZone(value)).toBe("2026-01-15");
    expect(formatTimeInTimeZone(value)).toBe("09:00");
  });

  it("valida fechas y horas estrictamente", () => {
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("2027-02-29")).toBe(false);
    expect(isTimeString("23:59")).toBe(true);
    expect(isTimeString("24:00")).toBe(false);
  });

  it("calcula el día de semana sin depender de la zona del proceso", () => {
    expect(weekdayForDate("2026-08-03")).toBe(1);
    expect(weekdayForDate("2026-08-08")).toBe(6);
  });
});
