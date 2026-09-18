"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

import { appointmentAreas } from "../appointments/options";

const schema = z.object({
  name: z.string().trim().min(3, "Escribe tu nombre completo.").max(120),
  email: z.string().trim().email("Escribe un correo válido."),
  phone: z.string().trim().min(8, "Escribe un teléfono válido.").max(24),
  company: z.string().trim().max(120).optional(),
  practiceArea: z.string().optional(),
  message: z
    .string()
    .trim()
    .min(20, "Escribe un mensaje de al menos 20 caracteres.")
    .max(2000),
  privacyAccepted: z
    .boolean()
    .refine(Boolean, "Debes aceptar el aviso de privacidad."),
  website: z.string().max(0).optional(),
});

type ContactValues = z.infer<typeof schema>;

export function ContactForm() {
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      practiceArea: "",
      message: "",
      privacyAccepted: false,
      website: "",
    },
  });

  async function submit(values: ContactValues) {
    setServerError("");
    setSuccess("");
    const response = await fetch("/api/contacto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      message?: string;
      reference?: string;
    };
    if (!response.ok || !payload.ok) {
      setServerError(
        payload.message ??
          "No fue posible enviar el mensaje. Intenta nuevamente.",
      );
      return;
    }
    setSuccess(
      `${payload.message ?? "Recibimos tu mensaje."}${payload.reference ? ` Referencia: ${payload.reference}.` : ""}`,
    );
    reset();
    window.dispatchEvent(
      new CustomEvent("xs:analytics", { detail: { event: "submit_contact" } }),
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submit)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="contact-name">
            Nombre completo
          </label>
          <input
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            aria-invalid={errors.name ? true : undefined}
            autoComplete="name"
            className="field"
            id="contact-name"
            {...register("name")}
          />
          {errors.name ? (
            <p
              className="mt-2 text-sm text-red-200"
              id="contact-name-error"
              role="alert"
            >
              {errors.name.message}
            </p>
          ) : null}
        </div>
        <div>
          <label className="field-label" htmlFor="contact-company">
            Empresa{" "}
            <span className="normal-case tracking-normal">(opcional)</span>
          </label>
          <input
            aria-describedby={
              errors.company ? "contact-company-error" : undefined
            }
            aria-invalid={errors.company ? true : undefined}
            autoComplete="organization"
            className="field"
            id="contact-company"
            {...register("company")}
          />
          {errors.company ? (
            <p
              className="mt-2 text-sm text-red-200"
              id="contact-company-error"
              role="alert"
            >
              {errors.company.message}
            </p>
          ) : null}
        </div>
        <div>
          <label className="field-label" htmlFor="contact-email">
            Correo
          </label>
          <input
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            className="field"
            id="contact-email"
            type="email"
            {...register("email")}
          />
          {errors.email ? (
            <p
              className="mt-2 text-sm text-red-200"
              id="contact-email-error"
              role="alert"
            >
              {errors.email.message}
            </p>
          ) : null}
        </div>
        <div>
          <label className="field-label" htmlFor="contact-phone">
            Teléfono
          </label>
          <input
            aria-describedby={errors.phone ? "contact-phone-error" : undefined}
            aria-invalid={errors.phone ? true : undefined}
            autoComplete="tel"
            className="field"
            id="contact-phone"
            inputMode="tel"
            {...register("phone")}
          />
          {errors.phone ? (
            <p
              className="mt-2 text-sm text-red-200"
              id="contact-phone-error"
              role="alert"
            >
              {errors.phone.message}
            </p>
          ) : null}
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="contact-area">
          Área de interés
        </label>
        <select
          className="field"
          id="contact-area"
          {...register("practiceArea")}
        >
          <option value="">Seleccionar área (opcional)</option>
          {appointmentAreas.map((area) => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="contact-message">
          Mensaje
        </label>
        <textarea
          aria-describedby={
            errors.message ? "contact-message-error" : undefined
          }
          aria-invalid={errors.message ? true : undefined}
          className="field min-h-36 resize-y py-3"
          id="contact-message"
          placeholder="Describe de forma general cómo podemos orientarte."
          {...register("message")}
        />
        {errors.message ? (
          <p
            className="mt-2 text-sm text-red-200"
            id="contact-message-error"
            role="alert"
          >
            {errors.message.message}
          </p>
        ) : null}
      </div>
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="contact-website">Sitio web</label>
        <input
          autoComplete="off"
          id="contact-website"
          tabIndex={-1}
          {...register("website")}
        />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4 text-sm leading-6 text-paper-muted">
        <input
          aria-describedby={
            errors.privacyAccepted ? "contact-privacy-error" : undefined
          }
          aria-invalid={errors.privacyAccepted ? true : undefined}
          className="mt-1 size-4 accent-white"
          id="contact-privacy"
          type="checkbox"
          {...register("privacyAccepted")}
        />
        <span>
          Acepto el{" "}
          <Link
            className="border-b border-white/40 text-paper"
            href="/aviso-de-privacidad"
            target="_blank"
          >
            aviso de privacidad
          </Link>{" "}
          para la atención de mi mensaje.
        </span>
      </label>
      {errors.privacyAccepted ? (
        <p
          className="text-sm text-red-200"
          id="contact-privacy-error"
          role="alert"
        >
          {errors.privacyAccepted.message}
        </p>
      ) : null}
      <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] p-4 text-xs leading-5 text-paper-quiet">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Por tu seguridad, evita compartir información confidencial o
        documentación sensible hasta que la firma confirme la recepción y
        establezca un canal adecuado.
      </div>
      {serverError ? (
        <p
          aria-live="assertive"
          className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100"
        >
          {serverError}
        </p>
      ) : null}
      {success ? (
        <p
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100"
        >
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {success}
        </p>
      ) : null}
      <Button disabled={isSubmitting} size="lg" type="submit">
        {isSubmitting ? "Enviando…" : "Enviar mensaje"}{" "}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
    </form>
  );
}
