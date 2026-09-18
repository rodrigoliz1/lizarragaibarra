import { NextResponse } from "next/server";

import { ensureSameOrigin, RequestSecurityError } from "@/lib/security/request";
import { requireActor } from "@/server/policies";
import { submitArticle } from "@/server/services/article-service";
import { ServiceError } from "@/server/services/errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ articleId: string }> },
) {
  try {
    ensureSameOrigin(request);
    const [{ articleId }, actor] = await Promise.all([
      context.params,
      requireActor(["LAWYER", "ADMIN"]),
    ]);
    const result = await submitArticle(actor, articleId);
    return NextResponse.json({
      ok: true,
      message: "Artículo enviado a revisión.",
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
            : "No fue posible enviar el artículo.",
      },
      { status },
    );
  }
}
