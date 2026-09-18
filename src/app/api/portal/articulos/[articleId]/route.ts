import { NextResponse } from "next/server";

import {
  ensureSameOrigin,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { articleEditorSchema } from "@/lib/validation";
import { requireActor } from "@/server/policies";
import {
  deleteArticle,
  updateArticleDraft,
} from "@/server/services/article-service";
import { ServiceError } from "@/server/services/errors";

export async function PATCH(
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
    const parsed = articleEditorSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        {
          ok: false,
          message: "Revisa el contenido del artículo.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    const article = await updateArticleDraft(actor, articleId, parsed.data);
    return NextResponse.json({
      ok: true,
      message: "Cambios guardados.",
      data: article,
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
            : "No fue posible actualizar el borrador.",
      },
      { status },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ articleId: string }> },
) {
  try {
    ensureSameOrigin(request);
    const [{ articleId }, actor] = await Promise.all([
      context.params,
      requireActor(["LAWYER", "ADMIN"]),
    ]);
    await deleteArticle(actor, articleId);
    return NextResponse.json({ ok: true, message: "Artículo eliminado." });
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
            : "No fue posible eliminar el artículo.",
      },
      { status },
    );
  }
}
