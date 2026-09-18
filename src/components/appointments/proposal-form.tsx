"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProposalForm({
  appointmentId,
  durationMinutes = 45,
}: {
  appointmentId: string;
  durationMinutes?: number;
}) {
  const router = useRouter();
  const [start, setStart] = useState("");
  const [modality, setModality] = useState("IN_PERSON");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startAt = new Date(start);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
    setPending(true);
    const response = await fetch(
      `/api/portal/citas/${appointmentId}/propuestas`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          modality,
          message: message || undefined,
        }),
      },
    ).catch(() => null);
    const payload = response
      ? ((await response.json()) as { message?: string })
      : {};
    setStatus(payload.message || "No fue posible enviar la propuesta.");
    setPending(false);
    if (response?.ok) {
      setStart("");
      setMessage("");
      router.refresh();
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-5 grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2"
    >
      <label className="text-[10px] uppercase tracking-[0.14em] text-white/40">
        Nuevo horario
        <input
          type="datetime-local"
          required
          value={start}
          onChange={(event) => setStart(event.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white"
        />
      </label>
      <label className="text-[10px] uppercase tracking-[0.14em] text-white/40">
        Modalidad
        <select
          value={modality}
          onChange={(event) => setModality(event.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-sm text-white"
        >
          <option value="IN_PERSON">Presencial</option>
          <option value="VIDEO_CALL">Videollamada</option>
          <option value="PHONE_CALL">Telefónica</option>
        </select>
      </label>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Mensaje prudente para la contraparte"
        className="min-h-20 rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white sm:col-span-2"
      />
      <button
        disabled={pending}
        className="h-11 rounded-full bg-white px-5 text-[9px] font-bold uppercase tracking-[0.14em] text-black sm:col-span-2"
      >
        {pending ? "Enviando…" : "Proponer alternativa"}
      </button>
      {status ? (
        <p className="text-xs text-white/45 sm:col-span-2">{status}</p>
      ) : null}
    </form>
  );
}
