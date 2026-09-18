import { z } from "zod";

import { emailSchema, requiredMultiline } from "@/lib/validation/common";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria.").max(128),
  otp: z.string().trim().max(32).optional().or(z.literal("")),
});

export const passwordResetRequestSchema = z.object({ email: emailSchema });

const compromisedPasswords = new Set([
  "123456789012",
  "passwordpassword",
  "contraseñacontraseña",
  "qwertyqwertyqwerty",
  "lizarragaibarra123",
]);

export const passwordSchema = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres.")
  .refine(
    (password) => new TextEncoder().encode(password).byteLength <= 72,
    "La contraseña no puede exceder 72 bytes con el algoritmo actual.",
  )
  .refine(
    (password) => !compromisedPasswords.has(password.toLowerCase()),
    "Elija una contraseña menos común.",
  );

export const passwordResetSchema = z.object({
  token: z.string().min(32).max(200),
  password: passwordSchema,
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmation: z.string().min(1).max(128),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    path: ["confirmation"],
    message: "Las contraseñas no coinciden.",
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ["newPassword"],
    message: "La nueva contraseña debe ser distinta.",
  });

export const portalMessageSchema = z.object({
  body: requiredMultiline("El mensaje", 2, 3000),
  visibility: z.enum(["CLIENT", "INTERNAL", "INTERNAL_ONLY"]).optional(),
  clientRequestId: z.string().uuid().optional(),
});
