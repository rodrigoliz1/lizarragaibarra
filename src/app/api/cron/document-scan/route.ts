import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/security/cron";
import { processPendingDocumentScans } from "@/server/services/document-scan-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request, "FILE_SCAN_CRON_SECRET")) {
    return NextResponse.json(
      { ok: false },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  const result = await processPendingDocumentScans();
  return NextResponse.json(
    { ok: true, ...result },
    { headers: { "cache-control": "no-store" } },
  );
}

export const GET = handle;
export const POST = handle;
