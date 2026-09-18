import { NextResponse } from "next/server";

import {
  ensureSameOrigin,
  readPublicJson,
  RequestSecurityError,
} from "@/lib/security/request";
import { matterUpdateSchema } from "@/lib/validation";
import { requireActor } from "@/server/policies";
import { ServiceError } from "@/server/services/errors";
import { createMatterUpdate } from "@/server/services/matter-update-service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ matterId: string }> },
) {
  try {
    ensureSameOrigin(request);
    const [{ matterId }, actor, body] = await Promise.all([
      context.params,
      requireActor(["LAWYER", "ADMIN"]),
      readPublicJson(request),
    ]);
    const parsed = matterUpdateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        {
          ok: false,
          message: "Revisa los datos del avance.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    const update = await createMatterUpdate(actor, matterId, parsed.data);
    return NextResponse.json(
      { ok: true, message: "Avance guardado.", data: update },
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
            : "No fue posible guardar el avance.",
      },
      { status },
    );
  }
}
