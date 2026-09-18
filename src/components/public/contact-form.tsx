"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { practiceAreas } from "@/data/practice-areas";
export function PublicContactForm() {
  const [state, setState] = useState<{
    kind: "idle" | "sending" | "error" | "success";
    message: string;
  }>({ kind: "idle", message: "" });
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "sending") return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setState({ kind: "sending", message: "" });
    try {
      const response = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          practiceArea: data.get("practiceArea") || undefined,
          message: data.get("message"),
          website: data.get("website") || "",
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message ||
            "No pudimos registrar su mensaje. Intente nuevamente.",
        );
      setState({
        kind: "success",
        message:
          result.message ||
          "Su mensaje quedó registrado. El equipo revisará su solicitud.",
      });
      form.reset();
    } catch (e) {
      setState({
        kind: "error",
        message:
          e instanceof Error
            ? e.message
            : "No se pudo establecer conexión. Puede contactarnos por correo o WhatsApp.",
      });
    }
  }
  return (
    <form className="li-form" onSubmit={submit}>
      <div className="field-pair">
        <label>
          Nombre completo
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
          />
        </label>
        <label>
          Correo electrónico
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
      </div>
      <div className="field-pair">
        <label>
          Teléfono
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            minLength={10}
            maxLength={25}
          />
        </label>
        <label>
          Área de consulta
          <select name="practiceArea">
            <option value="">Seleccione una opción</option>
            {practiceAreas.map((a) => (
              <option value={a.slug} key={a.slug}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Cuéntenos brevemente sobre su asunto
        <textarea name="message" required minLength={10} maxLength={4000} />
      </label>
      <div hidden aria-hidden>
        <label>
          Sitio web
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="form-privacy-notice">
        Al enviar este formulario, sus datos serán tratados para atender su
        solicitud conforme a nuestro{" "}
        <Link href="/aviso-de-privacidad">Aviso de Privacidad</Link>.
      </p>
      <p style={{ fontSize: 11, lineHeight: 1.8, color: "var(--li-muted)" }}>
        Comparta sólo una descripción general. Evite incluir documentos o
        información sensible en este primer contacto.
      </p>
      {state.message && (
        <p
          role="status"
          className={"form-status " + (state.kind === "error" ? "error" : "")}
        >
          {state.message}
        </p>
      )}
      <button className="li-button" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Enviando…" : "Enviar mensaje"}
        <ArrowUpRight size={16} />
      </button>
    </form>
  );
}
