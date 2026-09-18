"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { AvailabilityCalendar } from "./availability-calendar";
import { appointmentAreas, appointmentLawyers } from "./options";
import { TimeSlotPicker } from "./time-slot-picker";

const schema = z.object({
  practiceArea: z.string().min(1, "Selecciona un área de consulta."),
  modality: z.enum(["PRESENCIAL", "VIDEOLLAMADA", "TELEFONICA"]),
  lawyerId: z.string().optional(),
  date: z.string().min(1, "Selecciona una fecha."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Selecciona un horario."),
  fullName: z.string().trim().min(3, "Escribe tu nombre completo.").max(120),
  company: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Escribe un correo válido."),
  phone: z.string().trim().min(8, "Escribe un teléfono válido.").max(24),
  description: z
    .string()
    .trim()
    .min(20, "Comparte una descripción general de al menos 20 caracteres.")
    .max(1500),
  website: z.string().max(0).optional(),
});

type FormValues = z.infer<typeof schema>;
const stepFields: Array<Array<keyof FormValues>> = [
  ["practiceArea", "modality"],
  ["date", "time"],
  ["fullName", "email", "phone", "description"],
];

type PortalAppointmentContext = {
  matterId: string;
  matterReference: string;
  lawyerName: string;
  practiceArea: string;
  lawyerSlug: string;
  fullName: string;
  company?: string;
  email: string;
  phone: string;
};

export function AppointmentWizard({
  baseDate,
  portalContext,
}: {
  baseDate: string;
  portalContext?: PortalAppointmentContext;
}) {
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const initialArea =
    portalContext?.practiceArea || searchParams.get("area") || "";
  const initialLawyer =
    portalContext?.lawyerSlug || searchParams.get("profesional") || "";
  const [step, setStep] = useState(0);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [reference, setReference] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      practiceArea: appointmentAreas.some((area) => area.value === initialArea)
        ? initialArea
        : "",
      modality: "PRESENCIAL",
      lawyerId: appointmentLawyers.some(
        (lawyer) => lawyer.value === initialLawyer,
      )
        ? initialLawyer
        : "",
      date: "",
      time: "",
      fullName: portalContext?.fullName || "",
      company: portalContext?.company || "",
      email: portalContext?.email || "",
      phone: portalContext?.phone || "",
      description: "",
      website: "",
    },
  });

  const date = useWatch({ control, name: "date" });
  const time = useWatch({ control, name: "time" });
  const lawyerId = useWatch({ control, name: "lawyerId" });
  const modality = useWatch({ control, name: "modality" });

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    const load = async () => {
      setLoadingSlots(true);
      setSlots([]);
      setValue("time", "");
      try {
        const query = new URLSearchParams({ date });
        if (lawyerId) query.set("lawyerId", lawyerId);
        if (modality) query.set("modality", modality);
        const response = await fetch(`/api/agenda/disponibilidad?${query}`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("No fue posible consultar los horarios.");
        const payload = (await response.json()) as { slots?: string[] };
        setSlots(payload.slots ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError")
          setServerMessage(
            "No pudimos consultar horarios. Intenta nuevamente.",
          );
      } finally {
        setLoadingSlots(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [date, lawyerId, modality, setValue]);

  const progress = useMemo(() => `${Math.min(step + 1, 3)} de 3`, [step]);

  async function nextStep() {
    const valid = await trigger(stepFields[step]);
    if (valid) {
      setServerMessage("");
      setStep((current) => Math.min(current + 1, 2));
    }
  }

  async function submit(values: FormValues) {
    setServerMessage("");
    const response = await fetch(
      portalContext ? "/api/portal/citas" : "/api/citas",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          ...(portalContext ? { matterId: portalContext.matterId } : {}),
        }),
      },
    );
    const payload = (await response.json()) as {
      ok?: boolean;
      message?: string;
      reference?: string;
    };
    if (!response.ok || !payload.ok) {
      setServerMessage(
        payload.message ??
          "No fue posible enviar la solicitud. Revisa los datos e intenta nuevamente.",
      );
      return;
    }
    setReference(payload.reference ?? "Solicitud recibida");
    window.dispatchEvent(
      new CustomEvent("xs:analytics", {
        detail: { event: "appointment_requested" },
      }),
    );
    setStep(3);
  }

  if (step === 3) {
    return (
      <div
        aria-live="polite"
        className="rounded-3xl border border-white/15 bg-white/[0.035] p-7 sm:p-10"
      >
        <div className="grid size-12 place-items-center rounded-full bg-paper text-ink">
          <Check aria-hidden="true" className="size-5" />
        </div>
        <p className="eyebrow mt-8 text-paper-quiet">Solicitud registrada</p>
        <h2 className="mt-4 max-w-xl font-serif text-4xl leading-none text-paper sm:text-5xl">
          El primer paso ya está en curso.
        </h2>
        <p className="mt-5 max-w-xl leading-7 text-paper-muted">
          Recibimos tu solicitud con referencia{" "}
          <strong className="text-paper">{reference}</strong>. Confirmaremos el
          horario y el canal de atención por correo.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="button-light" href="/">
            Volver al inicio
          </Link>
          <Link className="button-outline" href="/contacto">
            Ver contacto
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="rounded-3xl border border-white/15 bg-white/[0.025] p-5 sm:p-8 lg:p-10"
      onSubmit={handleSubmit(submit)}
    >
      {portalContext ? (
        <div className="mb-6 rounded-2xl border border-emerald-200/20 bg-emerald-200/[0.06] p-4 text-sm leading-6 text-emerald-50">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-100/60">
            Atención preferente · {portalContext.matterReference}
          </p>
          <p className="mt-2">
            La solicitud se enviará directamente a {portalContext.lawyerName},
            responsable de su asunto.
          </p>
        </div>
      ) : null}
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p className="eyebrow text-paper-quiet">Agenda</p>
          <p className="mt-2 text-sm text-paper-muted">Paso {progress}</p>
        </div>
        <div
          aria-label="Progreso de la solicitud"
          aria-valuemax={3}
          aria-valuemin={1}
          aria-valuenow={step + 1}
          aria-valuetext={`Paso ${progress}`}
          className="flex gap-2"
          role="progressbar"
        >
          {[0, 1, 2].map((item) => (
            <span
              aria-hidden="true"
              className={cn(
                "h-1 w-9 rounded-full",
                item <= step ? "bg-paper" : "bg-white/15",
              )}
              key={item}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="py-8"
          exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
          initial={reduceMotion ? false : { opacity: 0, x: 12 }}
          key={step}
          transition={{ duration: 0.28 }}
        >
          {step === 0 ? (
            <div className="space-y-6">
              <div>
                <label className="field-label" htmlFor="practiceArea">
                  Área de consulta
                </label>
                <select
                  aria-describedby={
                    errors.practiceArea ? "practiceArea-error" : undefined
                  }
                  aria-invalid={errors.practiceArea ? true : undefined}
                  className="field"
                  id="practiceArea"
                  {...register("practiceArea")}
                >
                  <option value="">Seleccionar área</option>
                  {appointmentAreas.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
                {errors.practiceArea ? (
                  <p
                    className="mt-2 text-sm text-red-200"
                    id="practiceArea-error"
                    role="alert"
                  >
                    {errors.practiceArea.message}
                  </p>
                ) : null}
              </div>
              <fieldset>
                <legend className="field-label">Modalidad</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    ["PRESENCIAL", "Presencial"],
                    ["VIDEOLLAMADA", "Videollamada"],
                    ["TELEFONICA", "Telefónica"],
                  ].map(([value, label]) => (
                    <label className="cursor-pointer" key={value}>
                      <input
                        className="peer sr-only"
                        type="radio"
                        value={value}
                        {...register("modality")}
                      />
                      <span className="flex min-h-12 items-center justify-center rounded-xl border border-white/15 text-sm text-paper-muted transition peer-checked:border-paper peer-checked:bg-paper peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-paper">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label className="field-label" htmlFor="lawyerId">
                  Profesional
                </label>
                <select
                  className="field"
                  id="lawyerId"
                  {...register("lawyerId")}
                >
                  {appointmentLawyers.map((lawyer) => (
                    <option key={lawyer.value || "auto"} value={lawyer.value}>
                      {lawyer.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-7">
              <div>
                <p className="field-label">Fecha</p>
                <AvailabilityCalendar
                  baseDate={baseDate}
                  errorMessageId={errors.date ? "date-error" : undefined}
                  value={date}
                  onChange={(value) =>
                    setValue("date", value, { shouldValidate: true })
                  }
                />
                {errors.date ? (
                  <p
                    className="mt-2 text-sm text-red-200"
                    id="date-error"
                    role="alert"
                  >
                    {errors.date.message}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="field-label">Horario · America/Mexico_City</p>
                <TimeSlotPicker
                  errorMessageId={errors.time ? "time-error" : undefined}
                  loading={loadingSlots}
                  onChange={(value) =>
                    setValue("time", value, { shouldValidate: true })
                  }
                  slots={slots}
                  value={time}
                />
                {errors.time ? (
                  <p
                    className="mt-2 text-sm text-red-200"
                    id="time-error"
                    role="alert"
                  >
                    {errors.time.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="fullName">
                    Nombre completo
                  </label>
                  <input
                    aria-describedby={
                      errors.fullName ? "fullName-error" : undefined
                    }
                    aria-invalid={errors.fullName ? true : undefined}
                    autoComplete="name"
                    className="field"
                    id="fullName"
                    {...register("fullName")}
                  />
                  {errors.fullName ? (
                    <p
                      className="mt-2 text-sm text-red-200"
                      id="fullName-error"
                      role="alert"
                    >
                      {errors.fullName.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="field-label" htmlFor="company">
                    Empresa{" "}
                    <span className="normal-case tracking-normal">
                      (opcional)
                    </span>
                  </label>
                  <input
                    aria-describedby={
                      errors.company ? "company-error" : undefined
                    }
                    aria-invalid={errors.company ? true : undefined}
                    autoComplete="organization"
                    className="field"
                    id="company"
                    {...register("company")}
                  />
                  {errors.company ? (
                    <p
                      className="mt-2 text-sm text-red-200"
                      id="company-error"
                      role="alert"
                    >
                      {errors.company.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="field-label" htmlFor="email">
                    Correo
                  </label>
                  <input
                    aria-describedby={errors.email ? "email-error" : undefined}
                    aria-invalid={errors.email ? true : undefined}
                    autoComplete="email"
                    className="field"
                    id="email"
                    type="email"
                    {...register("email")}
                  />
                  {errors.email ? (
                    <p
                      className="mt-2 text-sm text-red-200"
                      id="email-error"
                      role="alert"
                    >
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="field-label" htmlFor="phone">
                    Teléfono
                  </label>
                  <input
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    aria-invalid={errors.phone ? true : undefined}
                    autoComplete="tel"
                    className="field"
                    id="phone"
                    inputMode="tel"
                    {...register("phone")}
                  />
                  {errors.phone ? (
                    <p
                      className="mt-2 text-sm text-red-200"
                      id="phone-error"
                      role="alert"
                    >
                      {errors.phone.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="description">
                  Descripción general del asunto
                </label>
                <textarea
                  aria-describedby={
                    errors.description ? "description-error" : undefined
                  }
                  aria-invalid={errors.description ? true : undefined}
                  className="field min-h-32 resize-y py-3"
                  id="description"
                  placeholder="Comparte solo información general; no adjuntes ni reveles datos confidenciales en esta etapa."
                  {...register("description")}
                />
                {errors.description ? (
                  <p
                    className="mt-2 text-sm text-red-200"
                    id="description-error"
                    role="alert"
                  >
                    {errors.description.message}
                  </p>
                ) : null}
              </div>
              <div className="absolute left-[-9999px]" aria-hidden="true">
                <label htmlFor="website">Sitio web</label>
                <input
                  autoComplete="off"
                  id="website"
                  tabIndex={-1}
                  {...register("website")}
                />
              </div>
              <p className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-paper-muted">
                Al enviar este formulario, sus datos serán tratados para atender
                su solicitud conforme a nuestro{" "}
                <Link
                  className="border-b border-white/40 text-paper"
                  href="/aviso-de-privacidad"
                  target="_blank"
                >
                  Aviso de Privacidad
                </Link>
                .
              </p>
              <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] p-4 text-xs leading-5 text-paper-quiet">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                La solicitud no crea por sí misma una relación abogado–cliente.
                La firma confirmará disponibilidad y ausencia de conflicto antes
                de iniciar cualquier representación.
              </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {serverMessage ? (
        <p
          aria-live="assertive"
          className="mb-5 rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100"
        >
          {serverMessage}
        </p>
      ) : null}

      <div className="flex items-center justify-between border-t border-white/10 pt-5">
        <Button
          disabled={step === 0 || isSubmitting}
          onClick={() => setStep((current) => current - 1)}
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Anterior
        </Button>
        {step < 2 ? (
          <Button onClick={() => void nextStep()} type="button">
            Continuar <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        ) : (
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Enviando…" : "Solicitar cita"}{" "}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
