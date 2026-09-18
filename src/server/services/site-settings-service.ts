import "server-only";

import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";

export type PublicSiteSettings = {
  bookingEnabled: boolean;
  contactEnabled: boolean;
  legalName: string;
  privacyNotice: string;
  termsContent: string;
  legalContentStatus: string;
  firmName: string;
  domain: string;
  phoneDisplay: string;
  phoneE164: string;
  whatsappNumber: string;
  whatsappMessage: string;
  contactEmail: string;
  address: string;
  officeHours: string;
  timezone: string;
  socialLinks: Record<string, string>;
};

export const defaultPublicSiteSettings: PublicSiteSettings = {
  bookingEnabled: false,
  contactEnabled: false,
  legalName: "",
  privacyNotice: "",
  termsContent: "",
  legalContentStatus: "PENDING_REAL_CONTENT",
  firmName: siteConfig.name,
  domain: siteConfig.url,
  phoneDisplay: siteConfig.contact.phoneDisplay,
  phoneE164: siteConfig.contact.phoneHref,
  whatsappNumber: siteConfig.contact.whatsappNumber,
  whatsappMessage: siteConfig.contact.whatsappMessage,
  contactEmail: siteConfig.contact.email,
  address: siteConfig.contact.address,
  officeHours: siteConfig.contact.schedule,
  timezone: "America/Mexico_City",
  socialLinks: {},
};

function normalizeSocialLinks(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].trim().length > 0,
      )
      .map(([label, url]) => [label, url.trim()]),
  );
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  if (!process.env.DATABASE_URL?.trim()) return defaultPublicSiteSettings;

  try {
    const settings = await db.siteSettings.findUnique({
      where: { id: "default" },
      select: {
        bookingEnabled: true,
        contactEnabled: true,
        legalName: true,
        privacyNotice: true,
        termsContent: true,
        legalContentStatus: true,
        firmName: true,
        domain: true,
        phoneDisplay: true,
        phoneE164: true,
        whatsappNumber: true,
        whatsappMessage: true,
        contactEmail: true,
        address: true,
        officeHours: true,
        timezone: true,
        socialLinks: true,
      },
    });
    if (!settings) return defaultPublicSiteSettings;
    return {
      ...settings,
      socialLinks: normalizeSocialLinks(settings.socialLinks),
    };
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    return defaultPublicSiteSettings;
  }
}

export function getSettingsWhatsAppUrl(settings: PublicSiteSettings) {
  return `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(settings.whatsappMessage)}`;
}
