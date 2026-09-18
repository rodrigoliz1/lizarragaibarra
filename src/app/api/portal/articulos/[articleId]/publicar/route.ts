import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { ensureSameOrigin, RequestSecurityError } from "@/lib/security/request";
import { requirePartner } from "@/server/policies";
import { publishOwnArticle } from "@/server/services/article-service";
import { ServiceError } from "@/server/services/errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ articleId: string }> },
) {
  try {
    ensureSameOrigin(request);
    const [{ articleId }, actor] = await Promise.all([
      context.params,
      requirePartner(),
    ]);
    const result = await publishOwnArticle(actor, articleId);
    revalidatePath("/insights");
    revalidatePath(`/insights/${result.slug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json({
      ok: true,
      message: "Artículo publicado.",
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
            : "No fue posible publicar el artículo.",
      },
      { status },
    );
  }
}
