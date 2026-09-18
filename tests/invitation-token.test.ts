import { describe, expect, it } from "vitest";

import { createSecureToken, hashToken } from "@/lib/security/tokens";
import { activationSchema } from "@/lib/validation";

describe("invitación y activación", () => {
  it("genera un token aleatorio y sólo permite persistir/verificar su hash", () => {
    const created = createSecureToken();
    expect(created.token).not.toBe(created.tokenHash);
    expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(created.token)).toBe(created.tokenHash);
  });

  it("exige contraseña robusta y confirmación coincidente", () => {
    const token = createSecureToken().token;
    expect(
      activationSchema.safeParse({
        token,
        password: "Clave-Segura-2026!",
        passwordConfirmation: "Clave-Segura-2026!",
      }).success,
    ).toBe(true);
    expect(
      activationSchema.safeParse({
        token,
        password: "Clave-Segura-2026!",
        passwordConfirmation: "Otra-Clave-2026!",
      }).success,
    ).toBe(false);
  });
});
