const ALLOWED_SERVER_EVENTS = new Set([
  "click_whatsapp",
  "click_agendar",
  "submit_contact",
  "appointment_requested",
  "portal_login",
]);

type SafeAnalyticsValue = string | number | boolean;

export function trackServerEvent(
  event: string,
  properties: Record<string, SafeAnalyticsValue> = {},
) {
  if (!ALLOWED_SERVER_EVENTS.has(event)) return;
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== "true") return;
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, properties);
  }
  // Los adaptadores de navegador se cargan únicamente cuando el proveedor se configure.
  // Esta función jamás recibe nombre, correo, teléfono, descripciones o identificadores de asunto.
}
