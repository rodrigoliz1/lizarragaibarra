"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function DocumentUploader({ matterId }: { matterId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/portal/asuntos/${matterId}/documentos`,
        { method: "POST", body: new FormData(form) },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      setMessage(payload.message);
      form.reset();
      router.refresh();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "No fue posible cargar el documento.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={upload} className="document-upload">
      <h3>Subir documento</h3>
      <label>
        Título
        <input name="title" required minLength={2} maxLength={180} />
      </label>
      <label>
        Archivo
        <input
          name="file"
          type="file"
          accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.avif"
          required
        />
      </label>
      <label>
        Visibilidad
        <select name="visibility">
          <option value="INTERNAL">Sólo equipo legal</option>
          <option value="CLIENT">Visible para el cliente</option>
        </select>
      </label>
      <p>
        Se guarda una copia nueva y se analiza antes de habilitar su descarga.
        Los documentos existentes no se sobrescriben.
      </p>
      {message && <p role="status">{message}</p>}
      <button className="button-light" disabled={busy}>
        {busy ? "Subiendo…" : "Guardar documento"}
      </button>
    </form>
  );
}
