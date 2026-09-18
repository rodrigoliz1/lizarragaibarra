import { z } from "zod";

import {
  emailSchema,
  optionalSingleLine,
  phoneSchema,
  requiredSingleLine,
} from "@/lib/validation/common";
import { passwordSchema } from "@/lib/validation/auth";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa un slug válido.");

export const invitedAccountSchema = z
  .object({
    role: z.enum(["CLIENT", "LAWYER", "ADMIN"]),
    name: requiredSingleLine("El nombre", 120),
    email: emailSchema,
    phone: phoneSchema.optional().or(z.literal("")),
    company: optionalSingleLine("La empresa", 160),
    rank: z.enum(["PARTNER", "ASSOCIATE"]).optional(),
    position: optionalSingleLine("El puesto", 120),
    slug: slugSchema.optional(),
    bio: z.string().max(5000).optional().default(""),
    education: z.string().max(2000).optional().default(""),
    practiceAreaIds: z.array(z.string().cuid()).max(20).default([]),
    supervisorId: z.string().cuid().optional().nullable(),
    publicProfile: z.boolean().default(false),
    sendInvite: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (value.role === "LAWYER" && (!value.rank || !value.slug)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rank"],
        message: "El rango y el slug son obligatorios para abogados.",
      });
    }
  });

export const activationSchema = z
  .object({
    token: z.string().min(32).max(200),
    password: passwordSchema,
    passwordConfirmation: z.string().max(72),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Las contraseñas no coinciden.",
  });

export const userStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]),
});

export type InvitedAccountInput = z.infer<typeof invitedAccountSchema>;
