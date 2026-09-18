import { createHash, randomBytes } from "node:crypto";

export function createSecureToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createPublicReference(prefix: "CITA" | "CONTACTO") {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `LI-${prefix}-${date}-${random}`;
}
