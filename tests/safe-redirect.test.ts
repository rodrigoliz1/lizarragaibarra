import { describe, expect, it } from "vitest";

import { safeInternalPath } from "@/lib/security/redirects";

describe("redirecciones internas", () => {
  it("conserva rutas relativas del mismo sitio", () => {
    expect(safeInternalPath("/portal/panel?tab=citas")).toBe(
      "/portal/panel?tab=citas",
    );
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%5Cevil.example",
    "/%2F%2Fevil.example",
  ])("rechaza el destino %s", (candidate) => {
    expect(safeInternalPath(candidate)).toBe("/portal");
  });
});
