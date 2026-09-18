import { describe, expect, it } from "vitest";

import { renderTransactionalEmail } from "@/lib/email/template";

describe("plantilla transaccional", () => {
  it("escapa contenido introducido por usuarios en HTML", () => {
    const rendered = renderTransactionalEmail({
      eyebrow: "Contacto",
      title: "Mensaje <script>alert(1)</script>",
      greeting: "Hola & bienvenido",
      paragraphs: ["<img src=x onerror=alert(1)>"],
      details: [{ label: "Nombre", value: "<b>Persona</b>" }],
    });
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).not.toContain("<img src=x");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).toContain("&lt;b&gt;Persona&lt;/b&gt;");
  });
});
