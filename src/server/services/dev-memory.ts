import "server-only";

import {
  addMinutes,
  generateAvailabilitySlots,
  reservationKey,
  reservationResourceKey,
  reservationSlotStarts,
} from "@/lib/calendar";
import type { AppointmentInput, ContactInput } from "@/lib/validation";
import { createPublicReference } from "@/lib/security/tokens";
import { ReservationConflictError } from "@/server/services/errors";

type DevStore = {
  reservationKeys: Set<string>;
  appointments: Array<
    AppointmentInput & { reference: string; createdAt: Date }
  >;
  contacts: Array<ContactInput & { reference: string; createdAt: Date }>;
};

const globalStore = globalThis as unknown as { xsDevStore?: DevStore };
export const devStore: DevStore = globalStore.xsDevStore ?? {
  reservationKeys: new Set(),
  appointments: [],
  contacts: [],
};
if (process.env.NODE_ENV !== "production") globalStore.xsDevStore = devStore;

export function developmentMemoryEnabled() {
  return false;
}

export function developmentAvailability(input: {
  date: string;
  lawyerId?: string;
  now?: Date;
}) {
  const resourceKey = reservationResourceKey(input.lawyerId);
  const generated = generateAvailabilitySlots({
    date: input.date,
    rule: {
      startMinutes: 9 * 60,
      endMinutes: 18 * 60,
      durationMinutes: 45,
      bufferMinutes: 15,
      timezone: "America/Mexico_City",
    },
    now: input.now,
  });
  return generated
    .filter((slot) =>
      reservationSlotStarts(slot.startsAt, 45, 15).every(
        (startsAt) =>
          !devStore.reservationKeys.has(reservationKey(resourceKey, startsAt)),
      ),
    )
    .map((slot) => ({
      ...slot,
      durationMinutes: 45,
      bufferMinutes: 15,
      timezone: "America/Mexico_City",
      resourceKey,
    }));
}

export function createDevelopmentAppointment(input: AppointmentInput) {
  const slot = developmentAvailability({
    date: input.date,
    lawyerId: input.lawyerId,
  }).find((candidate) => candidate.label === input.time);
  if (!slot) throw new ReservationConflictError();
  const keys = reservationSlotStarts(
    slot.startsAt,
    slot.durationMinutes,
    slot.bufferMinutes,
  ).map((startsAt) => reservationKey(slot.resourceKey, startsAt));
  if (keys.some((key) => devStore.reservationKeys.has(key)))
    throw new ReservationConflictError();
  keys.forEach((key) => devStore.reservationKeys.add(key));
  const reference = createPublicReference("CITA");
  devStore.appointments.push({ ...input, reference, createdAt: new Date() });
  return {
    reference,
    startsAt: slot.startsAt,
    endsAt: addMinutes(slot.startsAt, 45),
  };
}

export function createDevelopmentContact(input: ContactInput) {
  const reference = createPublicReference("CONTACTO");
  devStore.contacts.push({ ...input, reference, createdAt: new Date() });
  return { reference };
}
