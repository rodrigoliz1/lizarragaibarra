import { NextResponse } from "next/server";

import { requireActor } from "@/server/policies";
import { ServiceError } from "@/server/services/errors";
import { getPortalSummary } from "@/server/services/portal-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireActor();
    return NextResponse.json(await getPortalSummary(actor), {
      headers: {
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex",
      },
    });
  } catch (error) {
    const status = error instanceof ServiceError ? error.status : 500;
    return NextResponse.json(
      {
        message:
          error instanceof ServiceError
            ? error.message
            : "No fue posible cargar el portal.",
      },
      { status, headers: { "cache-control": "private, no-store" } },
    );
  }
}
