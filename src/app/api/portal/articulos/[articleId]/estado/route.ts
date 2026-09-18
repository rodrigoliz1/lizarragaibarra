import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ensureSameOrigin,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { requireActor } from "@/server/policies";
import {
  archiveArticle,
  restoreArticle,
} from "@/server/services/article-service";
import { ServiceError } from "@/server/services/errors";

const schema = z.object({ action: z.enum(["archive", "restore"]) });

export async function POST(
  request: Request,
  context: { params: Promise<{ articleId: string }> },
) {
  try {
    ensureSameOrigin(request);
    const [{ articleId }, actor, body] = await Promise.all([
      context.params,
      requireActor(["LAWYER", "ADMIN"]),
      readPublicJson(request),
    ]);
    const { action } = schema.parse(body);
    const article =
      action === "archive"
        ? await archiveArticle(actor, articleId)
        : await restoreArticle(actor, articleId);
    return NextResponse.json({
      ok: true,
      message:
        action === "archive" ? "Artículo archivado." : "Borrador restaurado.",
      data: article,
    });
  } catch (error) {
    const status =
      error instanceof RequestSecurityError || error instanceof ServiceError
        ? error.status
        : error instanceof z.ZodError
          ? 400
          : 500;
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && status !== 500
            ? error.message
            : "No fue posible cambiar el estado del artículo.",
      },
      { status },
    );
  }
}
