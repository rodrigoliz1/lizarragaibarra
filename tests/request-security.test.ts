import { afterEach, describe, expect, it } from "vitest";

import { ensureSameOrigin } from "@/lib/security/request";

afterEach(() => {
  delete process.env.VERCEL_ENV;
});

describe("protección de origen", () => {
  it("acepta una mutación del mismo origen", () => {
    expect(() =>
      ensureSameOrigin(
        new Request("https://lizarragaibarra.com/api/contacto", {
          method: "POST",
          headers: { origin: "https://lizarragaibarra.com" },
        }),
      ),
    ).not.toThrow();
  });

  it("rechaza cross-site aunque intente controlar Host", () => {
    expect(() =>
      ensureSameOrigin(
        new Request("https://lizarragaibarra.com/api/contacto", {
          method: "POST",
          headers: {
            origin: "https://evil.example",
            host: "evil.example",
            "sec-fetch-site": "cross-site",
          },
        }),
      ),
    ).toThrow("Origen no permitido");
  });

  it("falla cerrado sin Origin en un despliegue", () => {
    process.env.VERCEL_ENV = "production";
    expect(() =>
      ensureSameOrigin(
        new Request("https://lizarragaibarra.com/api/contacto", {
          method: "POST",
        }),
      ),
    ).toThrow("Origen no permitido");
  });
});
