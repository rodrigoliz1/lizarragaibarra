import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/security/cron";
import { processPendingCalendarSync } from "@/server/services/calendar-sync-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request, "CALENDAR_SYNC_CRON_SECRET")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const configured = Number(process.env.CALENDAR_SYNC_BATCH_SIZE || 20);
  const batchSize = Number.isFinite(configured) ? configured : 20;
  const result = await processPendingCalendarSync(batchSize);
  return NextResponse.json(
    { ok: true, ...result },
    { headers: { "cache-control": "no-store" } },
  );
}

export const GET = handle;
export const POST = handle;
