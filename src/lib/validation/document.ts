import { z } from "zod";

import { requiredSingleLine } from "@/lib/validation/common";

export const documentUploadMetadataSchema = z.object({
  title: requiredSingleLine("El título", 160),
  visibility: z.enum(["CLIENT", "INTERNAL"]).default("CLIENT"),
});
