import { randomUUID } from "node:crypto";

const REDACTED = "[REDACTED]";
const sensitiveKey =
  /(authorization|cookie|password|secret|token|api[-_]?key|credential|private[-_]?key|encrypted|payload|content)/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[MAX_DEPTH]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message.slice(0, 500),
      ...(process.env.NODE_ENV === "development" && value.stack
        ? { stack: value.stack }
        : {}),
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([key, item]) => [
          key,
          sensitiveKey.test(key) ? REDACTED : sanitize(item, depth + 1),
        ]),
    );
  }
  if (typeof value === "string") return value.slice(0, 2_000);
  return value;
}

type LogContext = Record<string, unknown>;

function write(
  level: "debug" | "info" | "warn" | "error",
  event: string,
  context: LogContext = {},
) {
  const order = { debug: 10, info: 20, warn: 30, error: 40 } as const;
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  const threshold =
    configured && configured in order
      ? order[configured as keyof typeof order]
      : process.env.NODE_ENV === "development"
        ? order.debug
        : order.info;
  if (order[level] < threshold) return;
  const sanitizedContext = sanitize(context) as Record<string, unknown>;
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "lizarraga-ibarra-web",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    ...sanitizedContext,
  });
  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else if (level === "debug") console.debug(record);
  else console.info(record);
}

export const logger = {
  debug: (event: string, context?: LogContext) =>
    write("debug", event, context),
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) =>
    write("error", event, context),
};

export function requestId(request?: Request) {
  return (
    request?.headers
      .get("x-request-id")
      ?.match(/^[A-Za-z0-9._-]{8,100}$/)?.[0] ?? randomUUID()
  );
}
