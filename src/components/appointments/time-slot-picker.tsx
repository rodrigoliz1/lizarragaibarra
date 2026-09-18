"use client";

import { Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";

export function TimeSlotPicker({
  slots,
  value,
  loading,
  onChange,
  errorMessageId,
}: {
  slots: string[];
  value?: string;
  loading?: boolean;
  onChange: (slot: string) => void;
  errorMessageId?: string;
}) {
  if (loading) {
    return (
      <div
        aria-describedby={errorMessageId}
        aria-live="polite"
        className="flex min-h-24 items-center gap-3 rounded-xl border border-white/10 p-4 text-sm text-paper-quiet"
      >
        <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-paper motion-reduce:animate-none" />
        Consultando disponibilidad…
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div
        aria-describedby={errorMessageId}
        className="flex min-h-24 items-center gap-3 rounded-xl border border-white/10 p-4 text-sm text-paper-quiet"
        role="group"
      >
        <Clock3 aria-hidden="true" className="size-5" />
        Selecciona una fecha para consultar horarios disponibles.
      </div>
    );
  }

  return (
    <div
      aria-describedby={errorMessageId}
      aria-label="Horarios disponibles"
      className="grid grid-cols-3 gap-2 sm:grid-cols-4"
      role="group"
    >
      {slots.map((slot) => (
        <button
          aria-pressed={value === slot}
          className={cn(
            "min-h-11 rounded-xl border text-sm tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper",
            value === slot
              ? "border-paper bg-paper text-ink"
              : "border-white/15 bg-white/[0.025] text-paper hover:border-white/40",
          )}
          key={slot}
          onClick={() => onChange(slot)}
          type="button"
        >
          {slot}
        </button>
      ))}
    </div>
  );
}
