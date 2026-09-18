import { timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isAuthorizedCronRequest(
  request: Request,
  variableName: string,
  environment: Record<string, string | undefined> = process.env,
) {
  const expected = environment[variableName]?.trim();
  if (!expected || expected.length < 24) return false;
  const authorization = request.headers.get("authorization")?.trim();
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  const custom = request.headers.get("x-cron-secret")?.trim() || "";
  return safeEqual(bearer, expected) || safeEqual(custom, expected);
}
