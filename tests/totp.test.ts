import { describe, expect, it } from "vitest";

import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  totpCode,
  verifyTotp,
} from "@/lib/security/totp";

describe("TOTP y códigos de recuperación", () => {
  it("cumple el vector RFC 6238 truncado a seis dígitos", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(totpCode(secret, 59_000)).toBe("287082");
    expect(verifyTotp(secret, "287082", 59_000, 0)).toBe(true);
  });

  it("admite una ventana temporal acotada", () => {
    const secret = generateTotpSecret();
    const timestamp = 1_700_000_000_000;
    const previous = totpCode(secret, timestamp - 30_000);
    expect(verifyTotp(secret, previous, timestamp, 1)).toBe(true);
    expect(verifyTotp(secret, previous, timestamp, 0)).toBe(false);
  });

  it("genera códigos de recuperación normalizables y hasheados", () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(normalizeRecoveryCode(codes[0])).toHaveLength(16);
    expect(hashRecoveryCode(codes[0], "pepper")).toMatch(/^[a-f0-9]{64}$/);
  });
});
