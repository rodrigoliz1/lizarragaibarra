import { NextResponse } from "next/server";

import {
  ensureSameOrigin,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { articleEditorSchema } from "@/lib/validation";
import { requireActor } from "@/server/policies";
import { createArticleDraft } from "@/server/services/article-service";
import { ServiceError } from "@/server/services/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const [actor, body] = await Promise.all([
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
    const article = await createArticleDraft(actor, parsed.data);
    return NextResponse.json(
      { ok: true, message: "Borrador guardado.", data: article },
      { status: 201 },
    );
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
            : "No fue posible guardar el borrador.",
      },
      { status },
    );
  }
}
