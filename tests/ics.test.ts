import { describe, expect, it } from "vitest";

import { buildGoogleCalendarUrl, generateIcsEvent } from "@/lib/calendar/ics";

describe("invitaciones de calendario", () => {
  const startsAt = new Date("2026-08-10T16:00:00.000Z");
  const endsAt = new Date("2026-08-10T16:45:00.000Z");

  it("genera un ICS confirmado, prudente y con secuencia", () => {
    const ics = generateIcsEvent({
      uid: "appointment-1@lizarragaibarra.com",
      sequence: 2,
      startsAt,
      endsAt,
      summary: "Consulta LIZÁRRAGA & IBARRA ABOGADOS",
      description: "Referencia XS-CITA-1",
      location: "Torre Celtis",
      organizer: {
        name: "LIZÁRRAGA & IBARRA ABOGADOS",
        email: "notificaciones@lizarragaibarra.com",
      },
      attendee: { name: "Cliente Ejemplo", email: "cliente@example.com" },
    });
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("SEQUENCE:2");
    expect(ics).toContain("DTSTART:20260810T160000Z");
    expect(ics).toContain("UID:appointment-1@lizarragaibarra.com");
    expect(ics).not.toContain("estrategia interna");
  });

  it("crea una URL compatible con Google Calendar", () => {
    const url = new URL(
      buildGoogleCalendarUrl({
        startsAt,
        endsAt,
        title: "Consulta LIZÁRRAGA & IBARRA ABOGADOS",
        description: "Referencia prudente",
        location: "Torre Celtis",
      }),
    );
    expect(url.origin).toBe("https://calendar.google.com");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe(
      "20260810T160000Z/20260810T164500Z",
    );
  });
});
