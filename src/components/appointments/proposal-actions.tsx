"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProposalActions({
  appointmentId,
  proposalId,
}: {
  appointmentId: string;
  proposalId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  async function respond(action: "accept" | "reject") {
    setPending(true);
    setStatus("");
    try {
      const response = await fetch(
        `/api/portal/citas/${appointmentId}/propuestas/${proposalId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const payload = (await response.json()) as { message?: string };
      setStatus(
        payload.message ||
          (response.ok ? "Respuesta registrada." : "No fue posible responder."),
      );
      if (response.ok) router.refresh();
    } catch {
      setStatus("No fue posible responder.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => respond("accept")}
          className="rounded-full bg-white px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-black disabled:opacity-50"
        >
          Aceptar definitivamente
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => respond("reject")}
          className="rounded-full border border-white/15 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/60 disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
      {status ? (
        <p className="mt-3 text-xs text-white/45" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
