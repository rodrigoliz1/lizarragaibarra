import { describe, expect, it } from "vitest";

import {
  getBrevoConfiguration,
  getEmailProviderName,
  isDemoAuthAllowed,
  isMockCalendarAllowed,
} from "@/lib/environment";
import { getSiteUrl } from "@/lib/site-url";

describe("entornos de Vercel", () => {
  it("permite demo y calendario mock en Preview", () => {
    const environment = {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "xs-preview.vercel.app",
      ENABLE_DEMO_AUTH: "true",
    };
    expect(isDemoAuthAllowed(environment)).toBe(true);
    expect(isMockCalendarAllowed(environment)).toBe(true);
    expect(getSiteUrl(environment)).toBe("https://xs-preview.vercel.app");
  });

  it("bloquea demo y calendario mock en Production", () => {
    const environment = {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://lizarragaibarra.com",
      ENABLE_DEMO_AUTH: "true",
    };
    expect(isDemoAuthAllowed(environment)).toBe(false);
    expect(isMockCalendarAllowed(environment)).toBe(false);
    expect(getSiteUrl(environment)).toBe("https://lizarragaibarra.com");
  });

  it("prioriza una URL explícita segura y normalizada", () => {
    expect(
      getSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://preview.example.com/ruta/?x=1#hash",
        VERCEL_URL: "ignored.vercel.app",
      }),
    ).toBe("https://preview.example.com/ruta");
    expect(() =>
      getSiteUrl({ NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" }),
    ).toThrow();
  });

  it("valida las variables privadas obligatorias de Brevo", () => {
    expect(() => getBrevoConfiguration({ BREVO_API_KEY: "secret" })).toThrow(
      /EMAIL_FROM_ADDRESS/,
    );
    expect(
      getBrevoConfiguration({
        BREVO_API_KEY: "secret",
        EMAIL_FROM_ADDRESS: "notificaciones@lizarragaibarra.com",
        EMAIL_FROM_NAME: "LIZÁRRAGA & IBARRA ABOGADOS",
        BREVO_SANDBOX_MODE: "true",
      }),
    ).toMatchObject({
      fromAddress: "notificaciones@lizarragaibarra.com",
      fromName: "LIZÁRRAGA & IBARRA ABOGADOS",
      sandboxMode: true,
    });
  });

  it("selecciona Brevo, conserva Resend y rechaza proveedores desconocidos", () => {
    expect(getEmailProviderName({ EMAIL_PROVIDER: "brevo" })).toBe("brevo");
    expect(getEmailProviderName({ EMAIL_PROVIDER: "resend" })).toBe("resend");
    expect(() =>
      getEmailProviderName({ EMAIL_PROVIDER: "desconocido" }),
    ).toThrow(/no soportado/);
  });
});
