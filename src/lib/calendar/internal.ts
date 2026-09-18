import { db } from "@/lib/db";
import type { CalendarEventInput, CalendarProvider } from "./types";
/** The agenda lives in PostgreSQL. Availability, holds and reservations are
 * checked in availability-service, scoped to the selected lawyer/resource. */
export class InternalCalendarProvider implements CalendarProvider {
  readonly name = "internal" as const;
  async getBusyIntervals() {
    return [];
  } // No external calendar to merge.
  async createEvent(input: CalendarEventInput) {
    const appointment = await db.appointment.findUniqueOrThrow({
      where: { reference: input.reference },
      select: { id: true },
    });
    return { externalEventId: "internal:" + appointment.id };
  }
  async updateEvent(_id: string, input: CalendarEventInput) {
    return this.createEvent(input);
  }
  async cancelEvent(id: string) {
    const appointment = await db.appointment.findUnique({
      where: { id: id.replace(/^internal:/, "") },
      select: { status: true },
    });
    if (appointment && appointment.status !== "CANCELLED")
      throw new Error("La cancelación debe registrarse primero en la agenda.");
  }
}
