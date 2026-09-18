import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  ensureSameOrigin,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { articleReviewSchema } from "@/lib/validation";
import { requirePartner } from "@/server/policies";
import { reviewArticle } from "@/server/services/article-service";
import { ServiceError } from "@/server/services/errors";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ articleId: string }> },
) {
  try {
    ensureSameOrigin(request);
    const [{ articleId }, actor, body] = await Promise.all([
      context.params,
      requirePartner(),
      readPublicJson(request),
    ]);
    const parsed = articleReviewSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        {
          ok: false,
          message: "Revisa la decisión editorial.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    const result = await reviewArticle(actor, articleId, parsed.data);
    revalidatePath("/insights");
    revalidatePath(`/insights/${result.slug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json({
      ok: true,
      message: "Decisión editorial registrada.",
      data: result,
    });
  } catch (error) {
    const status =
      error instanceof RequestSecurityError || error instanceof ServiceError
        ? error.status
        : 500;
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && status !== 500
            ? error.message
            : "No fue posible registrar la revisión.",
      },
      { status },
    );
  }
}
