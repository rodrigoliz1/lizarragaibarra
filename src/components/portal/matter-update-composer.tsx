"use client";

import { BellRing, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const stages = [
  ["", "Sin cambio de etapa"],
  ["INITIAL_REVIEW", "Evaluación inicial"],
  ["ANALYSIS", "En análisis"],
  ["STRATEGY_DEFINED", "Estrategia definida"],
  ["NEGOTIATION", "En negociación"],
  ["IN_PROGRESS", "En trámite"],
  ["PENDING_AUTHORITY", "Pendiente de autoridad"],
  ["PENDING_CLIENT", "Pendiente del cliente"],
  ["RESOLUTION", "Resolución"],
  ["CONCLUDED", "Concluido"],
] as const;

export function MatterUpdateComposer({ matterId }: { matterId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(`/api/portal/asuntos/${matterId}/avances`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        summary: form.get("summary"),
        body: form.get("body"),
        relatedStage: form.get("relatedStage") || undefined,
        nextAction: form.get("nextAction") || undefined,
        nextActionAt: form.get("nextActionAt") || undefined,
        visibility: form.get("visibility"),
        publish: form.get("publish") === "on",
      }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json()) as {
          message?: string;
          data?: { emailStatus?: string };
        })
      : {};
    setPending(false);
    if (!response?.ok) {
      setMessage(payload.message || "No fue posible guardar el avance.");
      return;
    }
    setMessage(
      payload.data?.emailStatus === "FAILED"
        ? "El avance se guardó, pero el correo quedó pendiente de reintento."
        : payload.data?.emailStatus === "SENT"
          ? "Avance publicado y cliente notificado por correo."
          : "Avance guardado correctamente.",
    );
    formElement.reset();
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block font-serif text-2xl">Registrar avance</span>
          <span className="mt-1 block text-xs leading-5 text-white/40">
            Publique hitos y notifique al cliente sin revelar notas internas.
          </span>
        </span>
        <Plus
          className={`size-4 transition ${open ? "rotate-45" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <input
            name="title"
            required
            maxLength={180}
            placeholder="Título del avance"
            className="h-11 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white"
          />
          <textarea
            name="summary"
            required
            minLength={5}
            maxLength={500}
            placeholder="Resumen breve para la notificación"
            className="min-h-20 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white"
          />
          <textarea
            name="body"
            required
            minLength={10}
            maxLength={10000}
            placeholder="Detalle visible del avance"
            className="min-h-32 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              name="relatedStage"
              className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
            >
              {stages.map(([value, label]) => (
                <option key={value || "none"} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              name="visibility"
              defaultValue="CLIENT"
              className="h-11 rounded-xl border border-white/10 bg-black px-3 text-sm text-white"
            >
              <option value="CLIENT">Visible para el cliente</option>
              <option value="INTERNAL">Solo equipo asignado</option>
              <option value="INTERNAL_ONLY">Reservado</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="nextAction"
              maxLength={500}
              placeholder="Próximo paso opcional"
              className="h-11 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white"
            />
            <input
              type="datetime-local"
              name="nextActionAt"
              className="h-11 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white"
            />
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-white/10 p-4 text-xs leading-5 text-white/55">
            <input
              type="checkbox"
              name="publish"
              defaultChecked
              className="mt-1"
            />
            <span>
              Publicar ahora. Si es visible para el cliente, recibirá una
              notificación en el portal y un correo transaccional.
            </span>
          </label>
          <button
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[9px] font-bold uppercase tracking-[0.14em] text-black"
          >
            <BellRing className="size-3.5" aria-hidden="true" />
            {pending ? "Guardando…" : "Guardar avance"}
          </button>
          {message ? (
            <p className="text-xs text-white/50" role="status">
              {message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
