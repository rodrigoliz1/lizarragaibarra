export const PREVIEW_ACCESS_EXPIRES_AT = "2026-09-23T10:47:28-06:00";
export const PREVIEW_ACCESS_DEADLINE_LABEL =
  "23 de septiembre de 2026, 10:47 h";
export const PREVIEW_ACCESS_OWNER_URL = "https://www.ipunto.digital";

const ADMIN_WHATSAPP_NUMBER = "526692122543";
const ADMIN_WHATSAPP_MESSAGE =
  "Hola, deseo ponerme en contacto con administración para liberar el sitio de LIZÁRRAGA & IBARRA ABOGADOS.";

export const PREVIEW_ACCESS_WHATSAPP_URL = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(ADMIN_WHATSAPP_MESSAGE)}`;

export type PreviewTimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  expired: boolean;
};

export function getPreviewTimeRemaining(
  expiresAt: string | Date = PREVIEW_ACCESS_EXPIRES_AT,
  now = new Date(),
): PreviewTimeRemaining {
  const deadline = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const difference = Math.max(0, deadline.getTime() - now.getTime());
  const totalSeconds = Math.floor(difference / 1000);

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    expired: totalSeconds === 0,
  };
}
