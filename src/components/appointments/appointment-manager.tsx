"use client";

import { CalendarClock, Check, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { AvailabilityCalendar } from "./availability-calendar";
import { TimeSlotPicker } from "./time-slot-picker";

type Mode = "menu" | "cancel" | "reschedule" | "done";

export function AppointmentManager({
  baseDate,
  token,
  lawyerId,
  modality,
}: {
  baseDate: string;
  token: string;
  lawyerId?: string;
  modality?: "IN_PERSON" | "VIDEO_CALL" | "PHONE_CALL";
}) {
  const [mode, setMode] = useState<Mode>("menu");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!date || mode !== "reschedule") return;
    const controller = new AbortController();
    const load = async () => {
      setLoadingSlots(true);
      setTime("");
      try {
        const query = new URLSearchParams({ date });
        if (lawyerId) query.set("lawyerId", lawyerId);
        if (modality)
          query.set(
            "modality",
            {
              IN_PERSON: "PRESENCIAL",
              VIDEO_CALL: "VIDEOLLAMADA",
              PHONE_CALL: "TELEFONICA",
            }[modality],
          );
        const response = await fetch(`/api/agenda/disponibilidad?${query}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as { slots?: string[] };
        setSlots(response.ok ? (payload.slots ?? []) : []);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [date, lawyerId, modality, mode]);

  async function submit(action: "cancelar" | "reprogramar") {
    setError("");
    if (action === "reprogramar" && (!date || !time)) {
      setError("Selecciona una fecha y un horario.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/citas/gestionar/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "cancelar"
            ? { token, reason }
            : { token, date, time, reason },
        ),
      });
      const payload = (await response.json()) as {
        message?: string;
        reference?: string;
      };
      if (!response.ok) {
        setError(payload.message ?? "No fue posible procesar la solicitud.");
        return;
      }
      setMessage(
        `${payload.message ?? "Solicitud procesada."}${payload.reference ? ` Referencia: ${payload.reference}.` : ""}`,
      );
      setMode("done");
    } catch {
      setError("No fue posible procesar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "done") {
    return (
      <div
        className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-7 sm:p-10"
        role="status"
      >
        <Check aria-hidden="true" className="size-6 text-emerald-100" />
        <h2 className="mt-6 font-serif text-4xl">Solicitud procesada.</h2>
        <p className="mt-4 text-sm leading-6 text-emerald-50/80">{message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-white/[0.025] p-5 sm:p-8 lg:p-10">
      <p className="eyebrow text-paper-quiet">Gestión de cita</p>
      <h2 className="mt-5 font-serif text-4xl leading-none sm:text-5xl">
        ¿Qué necesitas cambiar?
      </h2>
      <p className="mt-5 text-sm leading-6 text-paper-quiet">
        Esta liga personal permite cancelar la cita o solicitar un nuevo
        horario. No la compartas.
      </p>
      {mode === "menu" ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button onClick={() => setMode("reschedule")} size="lg" type="button">
            <CalendarClock aria-hidden="true" className="size-4" /> Solicitar
            reprogramación
          </Button>
          <Button
            onClick={() => setMode("cancel")}
            size="lg"
            type="button"
            variant="outline"
          >
            <XCircle aria-hidden="true" className="size-4" /> Cancelar cita
          </Button>
        </div>
      ) : null}
      {mode === "cancel" ? (
        <div className="mt-8">
          <label className="field-label" htmlFor="cancel-reason">
            Motivo{" "}
            <span className="normal-case tracking-normal">(opcional)</span>
          </label>
          <textarea
            className="field min-h-28 py-3"
            id="cancel-reason"
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              disabled={submitting}
              onClick={() => void submit("cancelar")}
              type="button"
            >
              {submitting ? "Procesando…" : "Confirmar cancelación"}
            </Button>
            <Button
              onClick={() => setMode("menu")}
              type="button"
              variant="ghost"
            >
              Volver
            </Button>
          </div>
        </div>
      ) : null}
      {mode === "reschedule" ? (
        <div className="mt-8 space-y-7">
          <div>
            <p className="field-label">Nueva fecha</p>
            <AvailabilityCalendar
              baseDate={baseDate}
              onChange={setDate}
              value={date}
            />
          </div>
          <div>
            <p className="field-label">Horario disponible</p>
            <TimeSlotPicker
              loading={loadingSlots}
              onChange={setTime}
              slots={slots}
              value={time}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="reschedule-reason">
              Comentario{" "}
              <span className="normal-case tracking-normal">(opcional)</span>
            </label>
            <textarea
              className="field min-h-24 py-3"
              id="reschedule-reason"
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={submitting}
              onClick={() => void submit("reprogramar")}
              type="button"
            >
              {submitting ? "Procesando…" : "Enviar solicitud"}
            </Button>
            <Button
              onClick={() => setMode("menu")}
              type="button"
              variant="ghost"
            >
              Volver
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p
          className="mt-5 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
