import { z } from "zod";
export const caseStudySchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    subtitle: z.string().trim().max(240),
    practiceArea: z.string().trim().min(2).max(100),
    summary: z.string().trim().min(20).max(600),
    context: z.string().trim().min(10).max(12000),
    challenge: z.string().trim().min(10).max(12000),
    strategy: z.string().trim().min(10).max(12000),
    result: z.string().trim().min(10).max(12000),
    coverImageId: z.string().cuid().nullable(),
    featured: z.boolean(),
    visibility: z.enum(["PUBLIC", "ANONYMIZED", "INTERNAL"]),
    status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"]),
    reviewed: z.boolean(),
    seoTitle: z.string().trim().max(70),
    seoDescription: z.string().trim().max(170),
  })
  .superRefine((data, ctx) => {
    if (
      data.status === "PUBLISHED" &&
      (!data.reviewed || data.visibility === "INTERNAL")
    )
      ctx.addIssue({
        code: "custom",
        path: ["reviewed"],
        message:
          "La publicación requiere revisión de confidencialidad y visibilidad pública o anonimizada.",
      });
  });
export type CaseStudyInput = z.infer<typeof caseStudySchema>;
