import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logger, requestId } from "@/lib/observability/logger";
import { validateRuntimeConfiguration } from "@/lib/runtime-configuration";
import { isAuthorizedCronRequest } from "@/lib/security/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function databaseReady() {
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("database-timeout")), 2_500),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (
    process.env.HEALTHCHECK_SECRET &&
    !isAuthorizedCronRequest(request, "HEALTHCHECK_SECRET")
  ) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  const currentRequestId = requestId(request);
  const [database, configuration] = await Promise.all([
    databaseReady(),
    Promise.resolve(validateRuntimeConfiguration()),
  ]);
  const healthy = database && configuration.valid;
  if (!healthy) {
    logger.warn("healthcheck.degraded", {
      requestId: currentRequestId,
      database,
      configurationValid: configuration.valid,
    });
  }
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      version: process.env.APP_VERSION || process.env.COMMIT_SHA || "unknown",
      checks: {
        database: database ? "up" : "down",
        configuration: configuration.valid ? "valid" : "invalid",
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "cache-control": "no-store",
        "x-request-id": currentRequestId,
      },
    },
  );
}
