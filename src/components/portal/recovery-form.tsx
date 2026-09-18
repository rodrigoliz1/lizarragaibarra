"use client";

import { useState } from "react";
import { z } from "zod";

const emailSchema = z.string().trim().email("Escribe un correo válido.");

export function RecoveryForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa el correo.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data }),
      });
      const payload = (await response.json()) as { message?: string };
      setMessage(
        payload.message ??
          "Si existe una cuenta activa, enviaremos instrucciones al correo registrado.",
      );
    } catch {
      setMessage(
        "Si existe una cuenta activa, enviaremos instrucciones al correo registrado.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (message) {
    return (
      <div
        className="mt-7 rounded-xl border border-[#d3d3d0]/25 bg-[#d3d3d0]/10 px-4 py-4 text-xs leading-5 text-[#f7f7f5]"
        role="status"
      >
        {message}
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <label className="block">
        <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Correo registrado
        </span>
        <input
          autoComplete="email"
          className="h-[52px] w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#d3d3d0]/60"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@empresa.com"
          required
          type="email"
          value={email}
        />
      </label>
      {error ? (
        <p className="text-xs text-red-100" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="h-[52px] w-full rounded-xl bg-white px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-paper disabled:cursor-wait disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Procesando…" : "Solicitar instrucciones"}
      </button>
      <p className="text-center text-[10px] leading-5 text-white/30">
        Por seguridad, la respuesta es la misma exista o no una cuenta con ese
        correo.
      </p>
    </form>
  );
}
