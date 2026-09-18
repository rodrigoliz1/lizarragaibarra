"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PasswordChangeForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
          confirmation: form.get("confirmation"),
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(body.message || "No fue posible actualizarla.");
      setMessage(body.message || "Contraseña actualizada.");
      router.replace("/portal/iniciar-sesion");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible actualizarla.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-xl space-y-5">
      {[
        ["currentPassword", "Contraseña actual"],
        ["newPassword", "Nueva contraseña"],
        ["confirmation", "Confirmar contraseña"],
      ].map(([name, label]) => (
        <label key={name} className="block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
            {label}
          </span>
          <input
            name={name}
            type="password"
            autoComplete={
              name === "currentPassword" ? "current-password" : "new-password"
            }
            minLength={name === "currentPassword" ? 1 : 12}
            required
            className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm"
          />
        </label>
      ))}
      <p className="text-xs leading-5 text-white/35">
        Puede usar una frase larga. El límite técnico actual es de 72 bytes.
      </p>
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-black disabled:opacity-50"
      >
        {busy ? "Actualizando…" : "Actualizar contraseña"}
      </button>
      {message ? (
        <p role="status" className="text-sm text-white/60">
          {message}
        </p>
      ) : null}
    </form>
  );
}
