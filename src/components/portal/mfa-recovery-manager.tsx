"use client";

import { useState } from "react";

export function MfaRecoveryManager() {
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/mfa/recovery-codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await response.json()) as {
        message?: string;
        recoveryCodes?: string[];
      };
      if (!response.ok)
        throw new Error(body.message || "No fue posible regenerarlos.");
      setCodes(body.recoveryCodes ?? []);
      setCode("");
      setMessage(
        "Guarde los nuevos códigos ahora. Los anteriores ya no funcionan.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No fue posible regenerarlos.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border-t border-white/10 pt-7">
      <h2 className="font-serif text-2xl">Códigos de recuperación</h2>
      <p className="mt-2 text-sm leading-6 text-white/45">
        Regenerarlos invalida inmediatamente todos los códigos anteriores.
      </p>
      {codes.length ? (
        <ul className="mt-5 grid gap-2 rounded-xl bg-black/30 p-5 font-mono text-sm sm:grid-cols-2">
          {codes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 flex max-w-md flex-col gap-3 sm:flex-row">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-label="Código actual de seis dígitos"
            placeholder="Código actual"
            className="h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm"
          />
          <button
            type="button"
            onClick={regenerate}
            disabled={busy || code.length !== 6}
            className="rounded-full border border-white/15 px-5 py-3 text-[9px] font-bold uppercase tracking-[0.14em] disabled:opacity-50"
          >
            {busy ? "Regenerando…" : "Regenerar"}
          </button>
        </div>
      )}
      {message ? (
        <p className="mt-4 text-xs text-white/55" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
