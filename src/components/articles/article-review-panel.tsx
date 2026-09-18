"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArticleReviewPanel({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  async function decide(
    decision: "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "PUBLISHED",
  ) {
    setPending(true);
    const response = await fetch(`/api/admin/articulos/${articleId}/revision`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, comments: comments || undefined }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json()) as { message?: string })
      : {};
    setStatus(payload.message || "No fue posible registrar la revisión.");
    setPending(false);
    if (response?.ok) router.refresh();
  }
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 text-black">
      <h2 className="font-serif text-3xl">Decisión editorial</h2>
      <textarea
        value={comments}
        onChange={(event) => setComments(event.target.value)}
        placeholder="Comentarios para el autor (obligatorios al solicitar cambios o rechazar)"
        maxLength={3000}
        className="mt-5 min-h-28 w-full rounded-xl border border-black/10 p-4 text-sm"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          disabled={pending}
          onClick={() => decide("APPROVED")}
          className="rounded-full bg-black px-4 py-2 text-[9px] font-bold uppercase tracking-[0.13em] text-white"
        >
          Aprobar
        </button>
        <button
          disabled={pending}
          onClick={() => decide("PUBLISHED")}
          className="rounded-full bg-emerald-800 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.13em] text-white"
        >
          Publicar
        </button>
        <button
          disabled={pending}
          onClick={() => decide("CHANGES_REQUESTED")}
          className="rounded-full border border-black/15 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.13em]"
        >
          Solicitar cambios
        </button>
        <button
          disabled={pending}
          onClick={() => decide("REJECTED")}
          className="rounded-full border border-red-700/25 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.13em] text-red-800"
        >
          Rechazar
        </button>
      </div>
      {status ? <p className="mt-4 text-xs text-black/45">{status}</p> : null}
    </section>
  );
}
