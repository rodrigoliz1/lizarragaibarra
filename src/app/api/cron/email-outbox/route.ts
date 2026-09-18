import { NextResponse } from "next/server";

import { processEmailOutboxBatch } from "@/lib/email";
import { isAuthorizedCronRequest } from "@/lib/security/cron";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request, "EMAIL_CRON_SECRET")) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const result = await processEmailOutboxBatch();
    return NextResponse.json(
      { ok: true, data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "No fue posible procesar la bandeja de salida." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
