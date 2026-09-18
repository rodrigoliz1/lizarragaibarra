import "server-only";
import { InternalCalendarProvider } from "./internal";

import { GoogleCalendarProvider } from "./google";
import { MockCalendarProvider } from "./mock";
import { isMockCalendarAllowed } from "@/lib/environment";

export * from "./dates";
export * from "./slots";
export * from "./types";
export * from "./ics";

let googleProvider: GoogleCalendarProvider | undefined;

export function getCalendarProvider() {
  const provider = process.env.CALENDAR_PROVIDER?.toLowerCase() || "internal";
  if (provider === "internal") return new InternalCalendarProvider();
  if (provider === "mock") {
    if (!isMockCalendarAllowed()) {
      throw new Error(
        "CALENDAR_PROVIDER=mock no está permitido en producción.",
      );
    }
    return new MockCalendarProvider();
  }

  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!clientId || !clientSecret || !refreshToken || !calendarId) {
      throw new Error("La configuración de Google Calendar está incompleta.");
    }
    googleProvider ??= new GoogleCalendarProvider({
      clientId,
      clientSecret,
      refreshToken,
      calendarId,
    });
    return googleProvider;
  }

  throw new Error(`Proveedor de calendario no soportado: ${provider}`);
}
