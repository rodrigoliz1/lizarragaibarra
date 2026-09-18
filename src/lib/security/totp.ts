import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

function encodeBase32(input: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(secret: string) {
  const normalized = secret.toUpperCase().replace(/=|\s|-/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Secreto TOTP no válido.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function counterBuffer(counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  return buffer;
}

export function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function totpCode(secret: string, timestampMs = Date.now()) {
  const counter = Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(counterBuffer(counter))
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function verifyTotp(
  secret: string,
  candidate: string,
  timestampMs = Date.now(),
  window = 1,
) {
  const normalized = candidate.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const candidateBuffer = Buffer.from(normalized);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = Buffer.from(
      totpCode(secret, timestampMs + offset * TOTP_STEP_SECONDS * 1000),
    );
    if (
      expected.length === candidateBuffer.length &&
      timingSafeEqual(expected, candidateBuffer)
    ) {
      return true;
    }
  }
  return false;
}

export function totpProvisioningUri(input: {
  secret: string;
  account: string;
  issuer?: string;
}) {
  const issuer = input.issuer ?? "LIZÁRRAGA & IBARRA ABOGADOS";
  const label = encodeURIComponent(`${issuer}:${input.account}`);
  return `otpauth://totp/${label}?secret=${input.secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(8).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12)}`;
  });
}

export function normalizeRecoveryCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(
  code: string,
  pepper = process.env.MFA_RECOVERY_CODE_PEPPER,
) {
  if (!pepper) {
    if (process.env.VERCEL_ENV || process.env.NODE_ENV === "production") {
      throw new Error(
        "MFA_RECOVERY_CODE_PEPPER es obligatorio en entornos desplegados.",
      );
    }
    pepper = "lizarraga-ibarra-local-mfa-pepper-not-for-deployment";
  }
  return createHmac("sha256", pepper)
    .update(normalizeRecoveryCode(code), "utf8")
    .digest("hex");
}
