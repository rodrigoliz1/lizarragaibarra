export const DEFAULT_WHATSAPP_NUMBER = "526692122543";
export const DEFAULT_WHATSAPP_MESSAGE =
  "Hola, me gustaría recibir información sobre los servicios de LIZÁRRAGA & IBARRA ABOGADOS.";

export function buildWhatsAppUrl(
  number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER,
  message = DEFAULT_WHATSAPP_MESSAGE,
) {
  const normalized = number.replace(/\D/g, "");
  if (normalized.length < 10 || normalized.length > 15) {
    throw new Error("El número de WhatsApp configurado no es válido.");
  }
  const url = new URL(`https://wa.me/${normalized}`);
  url.searchParams.set("text", message);
  return url.toString();
}
