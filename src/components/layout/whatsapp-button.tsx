import { getWhatsAppUrl } from "@/config/site";
export function WhatsAppButton() {
  return (
    <a className="sr-only focus:not-sr-only" href={getWhatsAppUrl()}>
      Contactar por WhatsApp
    </a>
  );
}
