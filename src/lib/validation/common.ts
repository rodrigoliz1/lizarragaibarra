import { z } from "zod";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeSingleLine(value: string) {
  return value.replace(CONTROL_CHARACTERS, " ").replace(/\s+/g, " ").trim();
}

export function sanitizeMultiline(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const requiredSingleLine = (label: string, max: number) =>
  z
    .string({ required_error: `${label} es obligatorio.` })
    .max(max * 2, `${label} es demasiado largo.`)
    .transform(sanitizeSingleLine)
    .pipe(
      z
        .string()
        .min(2, `${label} debe tener al menos 2 caracteres.`)
        .max(max, `${label} no puede exceder ${max} caracteres.`),
    );

export const optionalSingleLine = (label: string, max: number) =>
  z
    .string()
    .max(max * 2, `${label} es demasiado largo.`)
    .transform(sanitizeSingleLine)
    .pipe(z.string().max(max, `${label} no puede exceder ${max} caracteres.`))
    .optional()
    .transform((value) => value || undefined);

export const requiredMultiline = (label: string, min: number, max: number) =>
  z
    .string({ required_error: `${label} es obligatorio.` })
    .max(max * 2, `${label} es demasiado largo.`)
    .transform(sanitizeMultiline)
    .pipe(
      z
        .string()
        .min(min, `${label} debe tener al menos ${min} caracteres.`)
        .max(max, `${label} no puede exceder ${max} caracteres.`),
    );

export const emailSchema = z
  .string({ required_error: "El correo es obligatorio." })
  .trim()
  .toLowerCase()
  .email("Ingresa un correo válido.")
  .max(254, "El correo es demasiado largo.");

export const phoneSchema = z
  .string({ required_error: "El teléfono es obligatorio." })
  .max(40, "El teléfono es demasiado largo.")
  .transform(sanitizeSingleLine)
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }, "Ingresa un teléfono válido con lada.");

export const privacyAcceptanceSchema = z
  .boolean({ required_error: "Debes aceptar el aviso de privacidad." })
  .refine(Boolean, "Debes aceptar el aviso de privacidad.");

export const honeypotSchema = z.string().max(200).optional().default("");

export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}
