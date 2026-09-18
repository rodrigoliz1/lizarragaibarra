import "server-only";

import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

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

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL ?? "";
  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

  if (isNeonConnectionString(connectionString)) {
    return new PrismaClient({
      adapter: new PrismaNeon({ connectionString }),
      log,
    });
  }

  return new PrismaClient({
    log,
  });
}

export const db = globalForPrisma.liPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.liPrisma = db;
}
