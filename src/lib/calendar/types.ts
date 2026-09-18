export type CalendarBusyInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type CalendarEventInput = {
  reference: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  modality: "IN_PERSON" | "VIDEO_CALL" | "PHONE_CALL";
  attendeeName: string;
  attendeeEmail: string;
  practiceAreaName: string;
};

export interface CalendarProvider {
  readonly name: "mock" | "google" | "internal";
  getBusyIntervals(
    startsAt: Date,
    endsAt: Date,
  ): Promise<CalendarBusyInterval[]>;
  createEvent(input: CalendarEventInput): Promise<{ externalEventId: string }>;
  updateEvent(
    externalEventId: string,
    input: CalendarEventInput,
  ): Promise<{ externalEventId: string }>;
  cancelEvent(externalEventId: string): Promise<void>;
}
