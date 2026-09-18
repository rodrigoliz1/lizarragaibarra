import { describe, expect, it } from "vitest";

import {
  getPreviewTimeRemaining,
  PREVIEW_ACCESS_EXPIRES_AT,
  PREVIEW_ACCESS_WHATSAPP_URL,
} from "@/lib/preview-access";

describe("acceso temporal de vista previa", () => {
  it("inicia con una ventana global de exactamente 30 días", () => {
    expect(
      getPreviewTimeRemaining(
        PREVIEW_ACCESS_EXPIRES_AT,
        new Date("2026-08-24T10:47:28-06:00"),
      ),
    ).toMatchObject({
      days: 30,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: false,
    });
  });

  it("se detiene en cero al concluir el acceso", () => {
    expect(
      getPreviewTimeRemaining(
        PREVIEW_ACCESS_EXPIRES_AT,
        new Date("2026-09-24T10:47:28-06:00"),
      ),
    ).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      expired: true,
    });
  });

  it("dirige al número mexicano de administración", () => {
    expect(PREVIEW_ACCESS_WHATSAPP_URL).toContain("wa.me/526692122543");
  });
});
