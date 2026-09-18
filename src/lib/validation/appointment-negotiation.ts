import { z } from "zod";

import { requiredMultiline } from "@/lib/validation/common";

const secureMeetingUrl = z
  .string()
  .url()
  .max(500)
  .refine((value) => new URL(value).protocol === "https:", {
    message: "La liga de reunión debe usar HTTPS.",
  });

export const appointmentProposalSchema = z
  .object({
    startAt: z.coerce
      .date()
      .refine((value) => value > new Date(), "La fecha debe ser futura."),
    endAt: z.coerce.date(),
    modality: z.enum(["IN_PERSON", "VIDEO_CALL", "PHONE_CALL"]),
    location: z.string().trim().max(300).optional(),
    meetingUrl: secureMeetingUrl.optional().or(z.literal("")),
    message: requiredMultiline("El mensaje", 2, 1000).optional(),
  })
  .refine((value) => value.endAt > value.startAt, {
    path: ["endAt"],
    message: "La hora final debe ser posterior.",
  })
  .refine(
    (value) =>
      value.endAt.getTime() - value.startAt.getTime() <= 4 * 60 * 60 * 1000,
    { path: ["endAt"], message: "La cita no puede exceder cuatro horas." },
  );

export const appointmentProposalResponseSchema = z.object({
  action: z.enum(["accept", "reject"]),
  message: z.string().trim().max(1000).optional(),
});
