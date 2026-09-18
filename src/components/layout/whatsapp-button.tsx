import { getPublicSiteSettings, getSettingsWhatsAppUrl } from "@/server/services/site-settings-service";

function WhatsAppMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.4-4.2a8.5 8.5 0 1 1 15.6-4.6Z" />
      <path d="M8.1 7.7c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.8 1.9c.1.3 0 .5-.1.7l-.6.8c-.2.2-.1.4 0 .6.5.9 1.3 1.7 2.2 2.2.3.2.5.2.7 0l.9-1.1c.2-.2.4-.3.7-.2l1.9.9c.3.1.5.3.5.5 0 .3-.1 1.3-.7 1.8-.5.6-1.4.9-2.3.7-1.2-.2-2.7-.8-4.5-2.4-1.5-1.4-2.5-3.1-2.8-4.3-.2-.8 0-1.5.4-2Z" />
    </svg>
  );
}

export async function WhatsAppButton() {
  const settings = await getPublicSiteSettings();
  if (!settings.whatsappNumber) return null;
  return (
    <a
      aria-label={`Contactar por WhatsApp al ${settings.phoneDisplay}`}
      className="floating-whatsapp"
      href={getSettingsWhatsAppUrl(settings)}
      rel="noopener noreferrer"
      target="_blank"
    >
      <WhatsAppMark />
      <span>WhatsApp</span>
    </a>
  );
}
