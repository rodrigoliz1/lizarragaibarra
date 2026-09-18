"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArticleManagementActions({
  articleId,
  status,
  editHref,
  returnHref,
  theme = "dark",
}: {
  articleId: string;
  status: string;
  editHref: string;
  returnHref: string;
  theme?: "dark" | "light";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const dark = theme === "dark";

  async function changeState(action: "archive" | "restore") {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/portal/articulos/${articleId}/estado`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json()) as { message?: string })
      : {};
    setPending(false);
    setMessage(payload.message || "No fue posible actualizar el artículo.");
    if (response?.ok) router.refresh();
  }

  async function remove() {
    if (
      !window.confirm(
        "Esta eliminación es definitiva. ¿Deseas eliminar el artículo?",
      )
    )
      return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/portal/articulos/${articleId}`, {
      method: "DELETE",
    }).catch(() => null);
    const payload = response
      ? ((await response.json()) as { message?: string })
      : {};
    setPending(false);
    setMessage(payload.message || "No fue posible eliminar el artículo.");
    if (response?.ok) router.push(returnHref);
  }

  const base = dark
    ? "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
    : "border-black/15 text-black/60 hover:border-black/35 hover:text-black";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status !== "SUBMITTED" ? (
          <Link
            href={editHref}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.13em] ${base}`}
          >
            <Pencil className="size-3.5" aria-hidden="true" /> Editar
          </Link>
        ) : null}
        {status === "ARCHIVED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => changeState("restore")}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.13em] ${base}`}
          >
            <ArchiveRestore className="size-3.5" aria-hidden="true" /> Restaurar
          </button>
        ) : status !== "SUBMITTED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => changeState("archive")}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.13em] ${base}`}
          >
            <Archive className="size-3.5" aria-hidden="true" /> Archivar
          </button>
        ) : null}
        {["DRAFT", "REJECTED", "ARCHIVED"].includes(status) ? (
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="inline-flex items-center gap-2 rounded-full border border-red-400/25 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.13em] text-red-300 hover:border-red-400/50"
          >
            <Trash2 className="size-3.5" aria-hidden="true" /> Eliminar
          </button>
        ) : null}
      </div>
      {message ? (
        <p
          className={`mt-3 text-xs ${dark ? "text-white/45" : "text-black/45"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
