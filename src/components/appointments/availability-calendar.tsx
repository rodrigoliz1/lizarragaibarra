"use client";

import { addDays, format, isWeekend, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

export function AvailabilityCalendar({
  baseDate,
  value,
  onChange,
  errorMessageId,
}: {
  baseDate: string;
  value?: string;
  onChange: (date: string) => void;
  errorMessageId?: string;
}) {
  const dates = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) =>
        addDays(parseISO(baseDate), index + 1),
      ).filter((date) => !isWeekend(date)),
    [baseDate],
  );
  return (
    <div
      aria-describedby={errorMessageId}
      aria-label="Fechas disponibles"
      className="grid grid-cols-3 gap-2 sm:grid-cols-5"
      role="group"
    >
      {dates.slice(0, 15).map((date) => {
        const isoDate = format(date, "yyyy-MM-dd");
        const selected = value === isoDate;
        return (
          <button
            aria-pressed={selected}
            className={cn(
              "min-h-[74px] rounded-xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper",
              selected
                ? "border-paper bg-paper text-ink"
                : "border-white/15 bg-white/[0.025] text-paper hover:border-white/40",
            )}
            key={isoDate}
            onClick={() => onChange(isoDate)}
            type="button"
          >
            <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.1em] opacity-65">
              {format(date, "EEE", { locale: es })}
            </span>
            <span className="mt-1 block font-serif text-2xl leading-none">
              {format(date, "d")}
            </span>
            <span className="mt-1 block text-[0.62rem] uppercase tracking-[0.08em] opacity-65">
              {format(date, "MMM", { locale: es })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
