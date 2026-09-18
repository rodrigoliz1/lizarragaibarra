import { createHash } from "node:crypto";

import type {
  CalendarEventInput,
  CalendarProvider,
} from "@/lib/calendar/types";

type GoogleCalendarConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
};

const GOOGLE_TIMEOUT_MS = 12_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "google" as const;

  constructor(private readonly config: GoogleCalendarConfig) {}

  private cachedToken?: { value: string; expiresAt: number };

  private async accessToken() {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.value;
    }
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
      grant_type: "refresh_token",
    });
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error("No fue posible autenticar el calendario configurado.");
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!payload.access_token)
      throw new Error("Google no devolvió un token de calendario.");
    this.cachedToken = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max(300, payload.expires_in ?? 3600) * 1000,
    };
    return payload.access_token;
  }

  private async request(path: string, init: RequestInit) {
    const token = await this.accessToken();
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3${path}`,
          {
            ...init,
            headers: {
              authorization: `Bearer ${token}`,
              "content-type": "application/json",
              ...init.headers,
            },
            cache: "no-store",
            signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
          },
        );
        if (!RETRYABLE_STATUS.has(response.status) || attempt === 2) {
          return response;
        }
      } catch (error) {
        lastError = error;
        if (attempt === 2) throw error;
      }
      await wait(150 * 2 ** attempt);
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Google Calendar no respondió.");
  }

  private eventPayload(input: CalendarEventInput) {
    return {
      summary: `Consulta LIZÁRRAGA & IBARRA ABOGADOS · ${input.practiceAreaName}`,
      description: `Referencia interna: ${input.reference}. No contiene la descripción del asunto.`,
      start: {
        dateTime: input.startsAt.toISOString(),
        timeZone: input.timezone,
      },
      end: {
        dateTime: input.endsAt.toISOString(),
        timeZone: input.timezone,
      },
      attendees: [
        { email: input.attendeeEmail, displayName: input.attendeeName },
      ],
      extendedProperties: { private: { xsReference: input.reference } },
    };
  }

  async getBusyIntervals(startsAt: Date, endsAt: Date) {
    const response = await this.request("/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin: startsAt.toISOString(),
        timeMax: endsAt.toISOString(),
        items: [{ id: this.config.calendarId }],
      }),
    });
    if (!response.ok)
      throw new Error(
        "No fue posible consultar la disponibilidad del calendario.",
      );
    const payload = (await response.json()) as {
      calendars?: Record<
        string,
        {
          busy?: Array<{ start?: string; end?: string }>;
          errors?: Array<{ reason?: string }>;
        }
      >;
    };
    const calendar = payload.calendars?.[this.config.calendarId];
    if (!calendar || (calendar.errors?.length ?? 0) > 0) {
      throw new Error("Google Calendar no confirmó la disponibilidad.");
    }
    return (calendar.busy ?? []).map((item) => {
      if (!item.start || !item.end) {
        throw new Error("Google Calendar devolvió un intervalo incompleto.");
      }
      const startsAt = new Date(item.start);
      const endsAt = new Date(item.end);
      if (
        !Number.isFinite(startsAt.getTime()) ||
        !Number.isFinite(endsAt.getTime()) ||
        endsAt <= startsAt
      ) {
        throw new Error("Google Calendar devolvió un intervalo inválido.");
      }
      return { startsAt, endsAt };
    });
  }

  async createEvent(input: CalendarEventInput) {
    const deterministicEventId = createHash("sha256")
      .update(`lizarraga-ibarra:${input.reference}`, "utf8")
      .digest("hex")
      .slice(0, 32);
    const response = await this.request(
      `/calendars/${encodeURIComponent(this.config.calendarId)}/events/${deterministicEventId}?sendUpdates=all`,
      {
        method: "PUT",
        body: JSON.stringify(this.eventPayload(input)),
      },
    );
    if (!response.ok)
      throw new Error(
        "No fue posible sincronizar la cita con Google Calendar.",
      );
    const payload = (await response.json()) as { id?: string };
    if (!payload.id)
      throw new Error(
        "Google Calendar no devolvió un identificador de evento.",
      );
    return { externalEventId: payload.id };
  }

  async updateEvent(externalEventId: string, input: CalendarEventInput) {
    const response = await this.request(
      `/calendars/${encodeURIComponent(this.config.calendarId)}/events/${encodeURIComponent(externalEventId)}?sendUpdates=all`,
      { method: "PATCH", body: JSON.stringify(this.eventPayload(input)) },
    );
    if (!response.ok) {
      throw new Error("No fue posible actualizar la cita en Google Calendar.");
    }
    const payload = (await response.json()) as { id?: string };
    return { externalEventId: payload.id ?? externalEventId };
  }

  async cancelEvent(externalEventId: string) {
    const response = await this.request(
      `/calendars/${encodeURIComponent(this.config.calendarId)}/events/${encodeURIComponent(
        externalEventId,
      )}`,
      { method: "DELETE" },
    );
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new Error("No fue posible cancelar el evento de Google Calendar.");
    }
  }
}
