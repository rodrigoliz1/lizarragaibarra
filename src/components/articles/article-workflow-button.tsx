"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArticleWorkflowButton({
  articleId,
  canPublish = false,
}: {
  articleId: string;
  canPublish?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit() {
    setPending(true);
    const response = await fetch(`/api/portal/articulos/${articleId}/enviar`, {
      method: "POST",
    }).catch(() => null);
    const payload = response
      ? ((await response.json()) as { message?: string })
      : {};
    setMessage(payload.message || "No fue posible enviar.");
    setPending(false);
    if (response?.ok) router.refresh();
  }
  async function publish() {
    setPending(true);
    const response = await fetch(
      `/api/portal/articulos/${articleId}/publicar`,
      { method: "POST" },
    ).catch(() => null);
    const payload = response
      ? ((await response.json()) as { message?: string })
      : {};
    setMessage(payload.message || "No fue posible publicar.");
    setPending(false);
    if (response?.ok) router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={submit}
        disabled={pending}
        className="rounded-full bg-white px-5 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-black"
      >
        {pending ? "Enviando…" : "Enviar a revisión"}
      </button>
      {canPublish ? (
        <button
          onClick={publish}
          disabled={pending}
          className="rounded-full border border-white/20 px-5 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-white"
        >
          Publicar directamente
        </button>
      ) : null}
      {message ? <p className="mt-3 text-xs text-white/45">{message}</p> : null}
    </div>
  );
}
