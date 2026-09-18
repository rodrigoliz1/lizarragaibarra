import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  createLazyForwardingProxy,
  getRequestDatabaseClient,
} from "@/lib/db/request-lifecycle";

const globalForPrisma = globalThis as unknown as {
  liPrisma?: PrismaClient;
};

function isNeonConnectionString(connectionString: string) {
  try {
    return new URL(connectionString).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

function createPrismaClient(requestScoped = false) {
  const connectionString = process.env.DATABASE_URL ?? "";
  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

  if (isNeonConnectionString(connectionString)) {
    return new PrismaClient({
      adapter: new PrismaNeon({
        connectionString,
        ...(requestScoped ? { maxUses: 1 } : {}),
      }),
      log,
    });
  }

  return new PrismaClient({
    log,
  });
}

function isCloudflareWorkersRuntime() {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  );
}

let nodePrisma: PrismaClient | undefined;

function getNodePrismaClient() {
  nodePrisma ??= globalForPrisma.liPrisma ?? createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.liPrisma = nodePrisma;
  }

  return nodePrisma;
}

function getPrismaClient() {
  if (isCloudflareWorkersRuntime()) {
    const { ctx } = getCloudflareContext();
    return getRequestDatabaseClient(ctx, () => createPrismaClient(true));
  }

  return getNodePrismaClient();
}

export const db = createLazyForwardingProxy<PrismaClient>(getPrismaClient);
