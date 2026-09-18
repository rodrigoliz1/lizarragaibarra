import { z } from "zod";

import {
  emailSchema,
  honeypotSchema,
  optionalSingleLine,
  phoneSchema,
  privacyAcceptanceSchema,
  requiredMultiline,
  requiredSingleLine,
} from "@/lib/validation/common";

export const contactSchema = z
  .object({
    name: requiredSingleLine("El nombre", 120),
    email: emailSchema,
    phone: phoneSchema,
    company: optionalSingleLine("La empresa", 160),
    practiceArea: optionalSingleLine("El área de interés", 100),
    message: requiredMultiline("El mensaje", 10, 2500),
    privacyAccepted: privacyAcceptanceSchema,
    website: honeypotSchema,
  })
  .strict();

export type ContactInput = z.infer<typeof contactSchema>;
