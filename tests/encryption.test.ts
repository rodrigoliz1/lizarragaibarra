import { describe, expect, it } from "vitest";

import {
  decryptSensitiveJson,
  decryptSensitiveString,
  encryptSensitiveJson,
  encryptSensitiveString,
} from "@/lib/security/encryption";

const environment = {
  NODE_ENV: "test",
  DATA_ENCRYPTION_KEY_VERSION: "v2",
  DATA_ENCRYPTION_KEY_CURRENT: Buffer.alloc(32, 7).toString("base64"),
};

describe("cifrado de aplicación", () => {
  it("cifra con AES-GCM y recupera el texto", () => {
    const encrypted = encryptSensitiveString("dato jurídico", environment);
    expect(encrypted).not.toContain("dato jurídico");
    expect(encrypted.startsWith("v2.")).toBe(true);
    expect(decryptSensitiveString(encrypted, environment)).toBe(
      "dato jurídico",
    );
  });

  it("detecta manipulación del ciphertext", () => {
    const encrypted = encryptSensitiveString("secreto", environment);
    const changed = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;
    expect(() => decryptSensitiveString(changed, environment)).toThrow();
  });

  it("cifra payloads JSON", () => {
    const encrypted = encryptSensitiveJson(
      { token: "no persistir en claro" },
      environment,
    );
    expect(decryptSensitiveJson(encrypted, environment)).toEqual({
      token: "no persistir en claro",
    });
  });
});
