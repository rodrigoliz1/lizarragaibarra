"use client";

import Link from "next/link";
import { useState } from "react";

export function ActivationForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) return setError("La liga no contiene una invitación válida.");
    if (password !== confirmation)
      return setError("Las contraseñas no coinciden.");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/activar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          passwordConfirmation: confirmation,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        return setError(payload.message || "La invitación no es válida.");
      setMessage(payload.message || "Cuenta activada.");
    } catch {
      setError("No fue posible activar la cuenta. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (message) {
    return (
      <div className="mt-8">
        <p
          className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-xs leading-5 text-emerald-100"
          role="status"
        >
          {message}
        </p>
        <Link
          className="mt-5 flex h-12 items-center justify-center rounded-xl bg-white text-[10px] font-bold uppercase tracking-[0.16em] text-black"
          href="/portal/iniciar-sesion"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <label className="block">
        <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Contraseña personal
        </span>
        <input
          className="h-[52px] w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none focus:border-white/40"
          autoComplete="new-password"
          minLength={12}
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Confirmar contraseña
        </span>
        <input
          className="h-[52px] w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none focus:border-white/40"
          autoComplete="new-password"
          minLength={12}
          required
          type="password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      <p className="text-[11px] leading-5 text-white/35">
        Usa al menos 12 caracteres con mayúscula, minúscula, número y símbolo.
      </p>
      {error ? (
        <p className="text-xs leading-5 text-red-100" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="h-[52px] w-full rounded-xl bg-white text-[10px] font-bold uppercase tracking-[0.16em] text-black disabled:cursor-wait disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Activando…" : "Activar mi cuenta"}
      </button>
    </form>
  );
}
