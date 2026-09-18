"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";

const passwordSchema = z
  .object({
    password: z.string().min(12, "Usa al menos 12 caracteres."),
    confirmation: z.string(),
  })
  .refine((values) => values.password === values.confirmation, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmation"],
  });

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = passwordSchema.safeParse({ password, confirmation });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa la contraseña.");
      return;
    }
    if (!token) {
      setError("La liga no contiene un token válido.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: parsed.data.password }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "La liga es inválida o ha vencido.");
        return;
      }
      setMessage(payload.message ?? "La contraseña fue actualizada.");
    } catch {
      setError("No fue posible actualizar la contraseña. Intenta nuevamente.");
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
          Nueva contraseña
        </span>
        <input
          autoComplete="new-password"
          className="h-[52px] w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none focus:border-white/40"
          minLength={12}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Confirmar contraseña
        </span>
        <input
          autoComplete="new-password"
          className="h-[52px] w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none focus:border-white/40"
          minLength={12}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
      </label>
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
        {submitting ? "Actualizando…" : "Actualizar contraseña"}
      </button>
    </form>
  );
}
