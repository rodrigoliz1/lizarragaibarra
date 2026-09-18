"use client";

import { Send } from "lucide-react";
import { useRef, useState } from "react";
import { z } from "zod";

const schema = z
  .string()
  .trim()
  .min(2, "Escribe un mensaje.")
  .max(3000, "El mensaje es demasiado extenso.");

type InternalScope = "none" | "staff" | "partner";
type MessageVisibility = "CLIENT" | "INTERNAL" | "INTERNAL_ONLY";

export function MessageComposer({
  matterId,
  internalScope = "none",
  onSent,
}: {
  matterId: string;
  internalScope?: InternalScope;
  onSent?: () => void;
}) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>("CLIENT");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const recipientLabel =
    internalScope === "none"
      ? "Mensaje para su equipo legal"
      : visibility === "CLIENT"
        ? "Mensaje para el cliente"
        : "Nota para el equipo";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa el mensaje.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/portal/asuntos/${matterId}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: parsed.data,
          ...(internalScope === "none" ? {} : { visibility }),
          clientRequestId: requestId.current,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "No fue posible enviar el mensaje.");
        return;
      }
      setBody("");
      requestId.current = crypto.randomUUID();
      setStatus("Mensaje enviado y registrado en el asunto.");
      onSent?.();
    } catch {
      setError("No fue posible enviar el mensaje.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="border-t border-white/10 p-4 sm:p-5" onSubmit={submit}>
      <label className="block">
        <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          {recipientLabel}
        </span>
        <textarea
          className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-paper-muted/60"
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            visibility === "CLIENT"
              ? "Escribe una actualización o pregunta…"
              : "Escribe una nota interna…"
          }
          required
          value={body}
        />
      </label>
      {internalScope !== "none" ? (
        <label className="mt-3 block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Visibilidad
          </span>
          <select
            className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none focus:border-paper-muted/60"
            onChange={(event) =>
              setVisibility(event.target.value as MessageVisibility)
            }
            value={visibility}
          >
            <option value="CLIENT">Visible para el cliente</option>
            <option value="INTERNAL">Solo equipo asignado</option>
            {internalScope === "partner" ? (
              <option value="INTERNAL_ONLY">
                Reservado para socios y administración
              </option>
            ) : null}
          </select>
        </label>
      ) : null}
      {error ? (
        <p className="mt-3 text-xs text-red-100" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="mt-3 text-xs text-emerald-100" role="status">
          {status}
        </p>
      ) : null}
      <button
        className="mt-3 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-semibold uppercase tracking-[0.14em] text-black disabled:cursor-wait disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Enviando…" : "Enviar mensaje"}
        <Send aria-hidden="true" className="size-3.5" />
      </button>
    </form>
  );
}
