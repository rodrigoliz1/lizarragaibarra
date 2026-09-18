type IcsEventInput = {
  uid: string;
  sequence?: number;
  startsAt: Date;
  endsAt: Date;
  summary: string;
  description: string;
  location?: string | null;
  organizer?: { name: string; email: string };
  attendee?: { name: string; email: string };
  method?: "REQUEST" | "CANCEL";
  status?: "CONFIRMED" | "CANCELLED";
};

function escapeIcs(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

function utc(value: Date) {
  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function fold(line: string) {
  const chunks: string[] = [];
  let remaining = line;
  while (Buffer.byteLength(remaining, "utf8") > 73) {
    let end = Math.min(73, remaining.length);
    while (Buffer.byteLength(remaining.slice(0, end), "utf8") > 73) end -= 1;
    chunks.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  chunks.push(remaining);
  return chunks.join("\r\n ");
}

export function generateIcsEvent(input: IcsEventInput) {
  const method = input.method ?? "REQUEST";
  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//LIZÁRRAGA & IBARRA ABOGADOS//Agenda Legal//ES",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${escapeIcs(input.uid)}`,
    `SEQUENCE:${input.sequence ?? 0}`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(input.startsAt)}`,
    `DTEND:${utc(input.endsAt)}`,
    `SUMMARY:${escapeIcs(input.summary)}`,
    `DESCRIPTION:${escapeIcs(input.description)}`,
    `STATUS:${input.status ?? (method === "CANCEL" ? "CANCELLED" : "CONFIRMED")}`,
    ...(input.location ? [`LOCATION:${escapeIcs(input.location)}`] : []),
    ...(input.organizer
      ? [
          `ORGANIZER;CN=${escapeIcs(input.organizer.name)}:mailto:${escapeIcs(input.organizer.email)}`,
        ]
      : []),
    ...(input.attendee
      ? [
          `ATTENDEE;CN=${escapeIcs(input.attendee.name)};RSVP=TRUE:mailto:${escapeIcs(input.attendee.email)}`,
        ]
      : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function buildGoogleCalendarUrl(input: {
  startsAt: Date;
  endsAt: Date;
  title: string;
  description: string;
  location?: string | null;
}) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", input.title);
  url.searchParams.set("dates", `${utc(input.startsAt)}/${utc(input.endsAt)}`);
  url.searchParams.set("details", input.description);
  if (input.location) url.searchParams.set("location", input.location);
  return url.toString();
}
