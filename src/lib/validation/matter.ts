import { z } from "zod";

import { requiredMultiline, requiredSingleLine } from "@/lib/validation/common";

export const matterUpdateSchema = z.object({
  title: requiredSingleLine("El título", 180),
  summary: requiredMultiline("El resumen", 5, 500),
  body: requiredMultiline("El contenido", 10, 10000),
  effectiveAt: z.coerce.date().default(() => new Date()),
  relatedStage: z
    .enum([
      "INITIAL_REVIEW",
      "ANALYSIS",
      "STRATEGY_DEFINED",
      "NEGOTIATION",
      "IN_PROGRESS",
      "PENDING_AUTHORITY",
      "PENDING_CLIENT",
      "RESOLUTION",
      "CONCLUDED",
      "ARCHIVED",
    ])
    .optional(),
  nextAction: z.string().trim().max(500).optional(),
  nextActionAt: z.coerce.date().optional(),
  visibility: z.enum(["CLIENT", "INTERNAL", "CLIENT_VISIBLE", "INTERNAL_ONLY"]),
  publish: z.boolean().default(true),
});
