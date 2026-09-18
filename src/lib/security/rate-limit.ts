import "server-only";

import { createHash } from "node:crypto";

import { db } from "@/lib/db";
import { isPublicProduction } from "@/lib/environment";

type MemoryBucket = { count: number; expiresAt: number };
const globalForRateLimit = globalThis as unknown as {
  xsRateLimits?: Map<string, MemoryBucket>;
  xsRateLimitWarningShown?: boolean;
};
const memoryBuckets =
  globalForRateLimit.xsRateLimits ?? new Map<string, MemoryBucket>();
if (process.env.NODE_ENV !== "production")
  globalForRateLimit.xsRateLimits = memoryBuckets;

export class RateLimitError extends Error {
  readonly status = 429;
  constructor(readonly retryAfterSeconds: number) {
    super("Se alcanzó el límite temporal de solicitudes. Intenta más tarde.");
  }
}

function rateLimitSalt() {
  const configured = process.env.RATE_LIMIT_SALT;
  if (configured) return configured;
  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview"
  ) {
    throw new Error("RATE_LIMIT_SALT es obligatorio en producción.");
  }
  return "lizarraga-ibarra-development-rate-limit-salt";
}

function clientAddress(request: Request) {
  const trustProxy =
    Boolean(process.env.VERCEL_ENV) ||
    process.env.TRUST_PROXY_HEADERS === "true" ||
    process.env.NODE_ENV !== "production";
  if (!trustProxy) return "untrusted-proxy";
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

function hashKey(value: string) {
  return createHash("sha256")
    .update(`${rateLimitSalt()}:${value}`)
    .digest("hex");
}

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
) {
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.expiresAt <= now) {
    memoryBuckets.set(key, { count: 1, expiresAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit)
    throw new RateLimitError(Math.ceil((bucket.expiresAt - now) / 1000));
}

export async function enforceRateLimit(input: {
  request: Request;
  scope: string;
  limit: number;
  windowMs: number;
  secondaryKey?: string;
}) {
  const now = Date.now();
  const identities = [
    `ip:${clientAddress(input.request)}`,
    ...(input.secondaryKey
      ? [`subject:${input.secondaryKey.trim().toLowerCase()}`]
      : []),
  ];
  const windowStartMs = Math.floor(now / input.windowMs) * input.windowMs;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + input.windowMs);
  const provider =
    process.env.RATE_LIMIT_PROVIDER?.trim().toLowerCase() ||
    (process.env.DATABASE_URL?.trim() ? "database" : "memory");
  if (!["memory", "database"].includes(provider)) {
    throw new Error(`RATE_LIMIT_PROVIDER no soportado: ${provider}`);
  }

  if (provider === "memory") {
    if (isPublicProduction()) {
      throw new Error(
        "RATE_LIMIT_PROVIDER=memory no está permitido en producción.",
      );
    }
    for (const identity of identities) {
      memoryLimit(
        `${input.scope}:${hashKey(identity)}:${windowStartMs}`,
        input.limit,
        input.windowMs,
        now,
      );
    }
    return;
  }

  if (!process.env.DATABASE_URL?.trim()) {
    if (isPublicProduction()) {
      throw new Error(
        "DATABASE_URL es obligatoria para RATE_LIMIT_PROVIDER=database.",
      );
    }
    for (const identity of identities) {
      memoryLimit(
        `${input.scope}:${hashKey(identity)}:${windowStartMs}`,
        input.limit,
        input.windowMs,
        now,
      );
    }
    return;
  }

  try {
    for (const identity of identities) {
      const keyHash = hashKey(identity);
      const bucket = await db.rateLimitBucket.upsert({
        where: {
          scope_keyHash_windowStart: {
            scope: input.scope,
            keyHash,
            windowStart,
          },
        },
        create: {
          scope: input.scope,
          keyHash,
          windowStart,
          expiresAt,
          count: 1,
        },
        update: { count: { increment: 1 }, expiresAt },
        select: { count: true },
      });
      if (bucket.count > input.limit) {
        throw new RateLimitError(
          Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
        );
      }
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    if (
      process.env.NODE_ENV === "production" &&
      process.env.VERCEL_ENV !== "preview"
    ) {
      throw error;
    }
    for (const identity of identities) {
      memoryLimit(
        `${input.scope}:${hashKey(identity)}:${windowStartMs}`,
        input.limit,
        input.windowMs,
        now,
      );
    }
  }
}
