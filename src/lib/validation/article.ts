import { z } from "zod";

import { requiredMultiline, requiredSingleLine } from "@/lib/validation/common";

const safeEditorialUrl = z
  .string()
  .url()
  .max(1000)
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "El enlace debe usar HTTP o HTTPS.",
  });

export const articleBlockSchema = z.object({
  type: z.enum([
    "HEADING_2",
    "HEADING_3",
    "PARAGRAPH",
    "LIST",
    "QUOTE",
    "CALLOUT",
    "IMAGE",
    "DIVIDER",
    "TABLE",
    "LINK",
    "NOTE",
    "CONCLUSION",
  ]),
  text: z.string().trim().max(12000).optional(),
  items: z.array(z.string().trim().max(1000)).max(50).optional(),
  href: safeEditorialUrl.optional(),
  mediaId: z.string().cuid().optional(),
});

export const articleEditorSchema = z.object({
  title: requiredSingleLine("El título", 180),
  subtitle: z.string().trim().max(220).optional(),
  excerpt: requiredMultiline("El resumen", 20, 500),
  practiceAreaId: z.string().cuid().optional(),
  introduction: z.string().trim().max(5000).optional(),
  conclusion: z.string().trim().max(5000).optional(),
  references: z.array(z.string().trim().max(1000)).max(50).default([]),
  tags: z.array(z.string().trim().max(60)).max(20).default([]),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  legalNotice: z.string().trim().max(1000).optional(),
  heroMediaId: z.string().cuid().optional(),
  coauthorIds: z.array(z.string().cuid()).max(10).default([]),
  blocks: z.array(articleBlockSchema).min(1).max(200),
  changeSummary: z.string().trim().max(500).optional(),
});

export const articleReviewSchema = z
  .object({
    decision: z.enum([
      "CHANGES_REQUESTED",
      "APPROVED",
      "REJECTED",
      "PUBLISHED",
    ]),
    comments: z.string().trim().max(3000).optional(),
  })
  .superRefine((value, context) => {
    if (
      ["CHANGES_REQUESTED", "REJECTED"].includes(value.decision) &&
      !value.comments
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comments"],
        message: "Incluye comentarios para el autor.",
      });
    }
  });
