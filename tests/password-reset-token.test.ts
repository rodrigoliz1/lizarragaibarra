import { describe, expect, it } from "vitest";

import { isPasswordResetTokenUsable } from "@/lib/security/password-reset";

const now = new Date("2026-08-02T18:00:00.000Z");
const validToken = {
  userId: "user-1",
  type: "PASSWORD_RESET",
  expiresAt: new Date("2026-08-02T18:30:00.000Z"),
  usedAt: null,
};

describe("token de recuperación", () => {
  it("acepta un token vigente y no utilizado", () => {
    expect(isPasswordResetTokenUsable(validToken, now)).toBe(true);
  });

  it("rechaza tokens vencidos o ya utilizados", () => {
    expect(
      isPasswordResetTokenUsable(
        { ...validToken, expiresAt: new Date("2026-08-02T17:59:59.000Z") },
        now,
      ),
    ).toBe(false);
    expect(
      isPasswordResetTokenUsable(
        { ...validToken, usedAt: new Date("2026-08-02T17:30:00.000Z") },
        now,
      ),
    ).toBe(false);
  });
});
