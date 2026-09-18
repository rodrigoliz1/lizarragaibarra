import { z } from "zod";

import {
  isCalendarDate,
  isPastZonedDateTime,
  isTimeString,
} from "@/lib/calendar/dates";
import {
  emailSchema,
  honeypotSchema,
  optionalSingleLine,
  phoneSchema,
  privacyAcceptanceSchema,
  requiredMultiline,
  requiredSingleLine,
} from "@/lib/validation/common";

export const appointmentSchema = z
  .object({
    fullName: requiredSingleLine("El nombre", 120),
    company: optionalSingleLine("La empresa", 160),
    email: emailSchema,
    phone: phoneSchema,
    practiceArea: z
      .string({ required_error: "Selecciona un área de práctica." })
      .trim()
      .min(1, "Selecciona un área de práctica.")
      .max(100),
    modality: z.enum(["PRESENCIAL", "VIDEOLLAMADA", "TELEFONICA"], {
      required_error: "Selecciona una modalidad.",
    }),
    lawyerId: z
      .string()
      .trim()
      .min(3, "El profesional seleccionado no es válido.")
      .max(100)
      .regex(/^[a-zA-Z0-9_-]+$/, "El profesional seleccionado no es válido.")
      .optional(),
    date: z
      .string({ required_error: "Selecciona una fecha." })
      .refine(isCalendarDate, "La fecha no es válida."),
    time: z
      .string({ required_error: "Selecciona un horario." })
      .refine(isTimeString, "El horario no es válido."),
    description: requiredMultiline("La descripción", 10, 2000),
    privacyAccepted: privacyAcceptanceSchema,
    website: honeypotSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      isCalendarDate(value.date) &&
      isTimeString(value.time) &&
      isPastZonedDateTime(value.date, value.time)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date"],
        message: "Selecciona una fecha y hora futuras.",
      });
    }
  });

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const availabilityQuerySchema = z.object({
  date: z.string().refine(isCalendarDate, "La fecha no es válida."),
  modality: z.enum(["PRESENCIAL", "VIDEOLLAMADA", "TELEFONICA"]).optional(),
  lawyerId: z
    .string()
    .trim()
    .min(3, "El profesional seleccionado no es válido.")
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "El profesional seleccionado no es válido.")
    .optional(),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const appointmentCancellationSchema = z.object({
  token: z.string().min(32).max(200),
  reason: optionalSingleLine("El motivo", 500),
});

export const appointmentRescheduleRequestSchema = z.object({
  token: z.string().min(32).max(200),
  date: z.string().refine(isCalendarDate, "La fecha no es válida."),
  time: z.string().refine(isTimeString, "El horario no es válido."),
  reason: optionalSingleLine("El motivo", 500),
});
