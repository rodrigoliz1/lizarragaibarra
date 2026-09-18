import { describe, expect, it } from "vitest";

import {
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_MESSAGE,
  DEFAULT_WHATSAPP_NUMBER,
} from "@/lib/security/whatsapp";

describe("enlace de WhatsApp", () => {
  it("normaliza el número y codifica el mensaje institucional", () => {
    const url = new URL(buildWhatsAppUrl("+52 669 212 2543"));
    expect(`${url.origin}${url.pathname}`).toBe(
      `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}`,
    );
    expect(url.searchParams.get("text")).toBe(DEFAULT_WHATSAPP_MESSAGE);
  });

  it("rechaza números inválidos", () => {
    expect(() => buildWhatsAppUrl("123")).toThrow(/no es válido/);
  });
});
