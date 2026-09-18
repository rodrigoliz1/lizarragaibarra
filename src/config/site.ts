import { getSiteUrl } from "@/lib/site-url";
import { lawyers } from "@/data/lawyers";
export const siteConfig = {
  name: "Lizárraga & Ibarra Abogados",
  shortName: "LI",
  legalName: "Lizárraga & Ibarra Abogados",
  description:
    "Litigio, estrategia y solución de controversias. Una firma jurídica dedicada a proteger sus intereses con rigor, claridad y atención cercana.",
  url: getSiteUrl(),
  locale: "es_MX",
  contact: {
    phoneDisplay: process.env.NEXT_PUBLIC_PHONE_DISPLAY ?? "669 212 2543",
    phoneHref: process.env.NEXT_PUBLIC_PHONE_E164 ?? "+52" + lawyers[0].phone,
    whatsappNumber:
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? lawyers[0].whatsapp,
    whatsappMessage:
      "Hola, quisiera agendar una consulta con Lizárraga & Ibarra Abogados.",
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? lawyers[0].email,
    address: process.env.NEXT_PUBLIC_OFFICE_ADDRESS ?? "",
    mapsUrl: process.env.NEXT_PUBLIC_MAPS_URL ?? "",
    schedule: "",
  },
  navigation: [
    { label: "Nosotros", href: "/nosotros" },
    { label: "Servicios", href: "/servicios" },
    { label: "Equipo", href: "/equipo" },
    { label: "Contacto", href: "/contacto" },
  ],
} as const;
export function getWhatsAppUrl(message = siteConfig.contact.whatsappMessage) {
  return `https://wa.me/${siteConfig.contact.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
