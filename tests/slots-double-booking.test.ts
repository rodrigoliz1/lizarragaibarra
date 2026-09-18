import { describe, expect, it } from "vitest";

import { zonedDateTimeToUtc } from "@/lib/calendar/dates";
import {
  generateAvailabilitySlots,
  hasReservationCollision,
  reservationKey,
  reservationSlotStarts,
} from "@/lib/calendar/slots";

describe("disponibilidad y doble reserva", () => {
  it("genera citas de 45 minutos con un intervalo de 15 minutos", () => {
    const slots = generateAvailabilitySlots({
      date: "2099-01-05",
      rule: {
        startMinutes: 9 * 60,
        endMinutes: 12 * 60,
        durationMinutes: 45,
        bufferMinutes: 15,
        timezone: "America/Mexico_City",
      },
      now: new Date("2098-01-01T00:00:00.000Z"),
    });
    expect(slots.map((slot) => slot.label)).toEqual([
      "09:00",
      "10:00",
      "11:00",
    ]);
  });

  it("elimina horarios que intersectan periodos ocupados", () => {
    const busyStart = zonedDateTimeToUtc("2099-01-05", "10:15");
    const slots = generateAvailabilitySlots({
      date: "2099-01-05",
      rule: {
        startMinutes: 9 * 60,
        endMinutes: 12 * 60,
        durationMinutes: 45,
        bufferMinutes: 15,
      },
      busyIntervals: [
        {
          startsAt: busyStart,
          endsAt: new Date(busyStart.getTime() + 15 * 60 * 1000),
        },
      ],
      now: new Date("2098-01-01T00:00:00.000Z"),
    });
    expect(slots.map((slot) => slot.label)).toEqual(["09:00", "11:00"]);
  });

  it("reserva cada cuanto de 15 minutos y detecta traslapes atómicos", () => {
    const resource = "lawyer:demo";
    const firstStart = zonedDateTimeToUtc("2099-01-05", "09:00");
    const overlappingStart = zonedDateTimeToUtc("2099-01-05", "09:15");
    const firstKeys = reservationSlotStarts(firstStart, 45, 15).map((date) =>
      reservationKey(resource, date),
    );
    const secondKeys = reservationSlotStarts(overlappingStart, 45, 15).map(
      (date) => reservationKey(resource, date),
    );

    expect(firstKeys).toHaveLength(4);
    expect(hasReservationCollision(firstKeys, secondKeys)).toBe(true);
    expect(
      hasReservationCollision(
        firstKeys,
        reservationSlotStarts(
          zonedDateTimeToUtc("2099-01-05", "10:00"),
          45,
          15,
        ).map((date) => reservationKey(resource, date)),
      ),
    ).toBe(false);
  });
});
