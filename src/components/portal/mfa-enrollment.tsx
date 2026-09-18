"use client";

import { useState } from "react";
import Link from "next/link";

type SetupResponse = {
  secret?: string;
  provisioningUri?: string;
  message?: string;
};

export function MfaEnrollment() {
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function begin() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const body = (await response.json()) as SetupResponse;
      if (!response.ok)
        throw new Error(body.message || "No fue posible iniciar MFA.");
      setSetup(body);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible iniciar MFA.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/mfa/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await response.json()) as SetupResponse & {
        recoveryCodes?: string[];
      };
      if (!response.ok)
        throw new Error(body.message || "No fue posible confirmar MFA.");
      setRecoveryCodes(body.recoveryCodes ?? []);
      setMessage(body.message ?? null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible confirmar MFA.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (recoveryCodes.length > 0) {
    return (
      <div className="space-y-6" aria-live="polite">
        <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.06] p-5 text-sm text-emerald-50">
          {message}
        </div>
        <div>
          <h2 className="font-serif text-3xl">Códigos de recuperación</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
            Se muestran una sola vez. Guárdelos fuera de este dispositivo; cada
            código funciona una sola vez.
          </p>
        </div>
        <ul className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-5 font-mono text-sm sm:grid-cols-2">
          {recoveryCodes.map((recoveryCode) => (
            <li key={recoveryCode}>{recoveryCode}</li>
          ))}
        </ul>
        <Link
          href="/portal/iniciar-sesion"
          className="inline-flex rounded-full bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-black"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!setup?.secret ? (
        <button
          type="button"
          disabled={busy}
          onClick={begin}
          className="rounded-full bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-black disabled:opacity-50"
        >
          {busy ? "Preparando…" : "Configurar aplicación autenticadora"}
        </button>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm leading-6 text-white/60">
              Agregue una cuenta TOTP en su aplicación autenticadora e ingrese
              esta clave manual:
            </p>
            <code className="mt-4 block break-all rounded-xl bg-black/40 p-4 text-base tracking-[0.16em] text-white">
              {setup.secret}
            </code>
            <details className="mt-4 text-xs text-white/40">
              <summary className="cursor-pointer">
                Mostrar URI de configuración
              </summary>
              <code className="mt-3 block break-all">
                {setup.provisioningUri}
              </code>
            </details>
          </div>
          <label className="block max-w-sm">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
              Código de seis dígitos
            </span>
            <input
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white"
            />
          </label>
          <button
            type="button"
            disabled={busy || code.length !== 6}
            onClick={confirm}
            className="rounded-full bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-black disabled:opacity-50"
          >
            {busy ? "Verificando…" : "Verificar y activar"}
          </button>
        </div>
      )}
      {message ? (
        <p
          className="rounded-xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100"
          role="alert"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
