import type { Prisma } from "@prisma/client";
import {
  Ban,
  CalendarClock,
  CircleAlert,
  Clock3,
  DatabaseZap,
  ShieldCheck,
} from "lucide-react";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import {
  DEFAULT_TIME_ZONE,
  formatDateInTimeZone,
  minutesToTime,
} from "@/lib/calendar";
import { db } from "@/lib/db";

import {
  createGlobalBlockedTimeAction,
  deleteGlobalBlockedTimeAction,
  saveGlobalAvailabilityAction,
} from "./actions";
import { AvailabilitySubmitButton } from "./availability-submit-button";

export const dynamic = "force-dynamic";

const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
] as const;

const ruleSelect = {
  id: true,
  weekday: true,
  startMinutes: true,
  endMinutes: true,
  durationMinutes: true,
  bufferMinutes: true,
  timezone: true,
  active: true,
} satisfies Prisma.AvailabilityRuleSelect;

const blockedTimeSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  reason: true,
  createdAt: true,
} satisfies Prisma.BlockedTimeSelect;

type AvailabilityRuleRow = Prisma.AvailabilityRuleGetPayload<{
  select: typeof ruleSelect;
}>;
type BlockedTimeRow = Prisma.BlockedTimeGetPayload<{
  select: typeof blockedTimeSelect;
}>;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AvailabilityData =
  | {
      kind: "ready";
      rules: AvailabilityRuleRow[];
      blockedTimes: BlockedTimeRow[];
      loadedAt: Date;
    }
  | { kind: "unavailable"; message: string };

const noticeMessages: Record<string, string> = {
  "schedule-saved":
    "El horario global de lunes a viernes quedó guardado y auditado.",
  "block-created":
    "El bloqueo global quedó registrado y ya se considera en la agenda.",
  "block-deleted":
    "El bloqueo global fue eliminado y el cambio quedó auditado.",
};

const errorMessages: Record<string, string> = {
  "invalid-schedule":
    "Revisa el inicio, fin, duración y buffer. La jornada debe contener al menos una cita.",
  "invalid-block":
    "Revisa la fecha y el intervalo del bloqueo. El final debe ser posterior al inicio.",
  overlap: "El intervalo coincide con otro bloqueo global existente.",
  "not-found": "El bloqueo ya no existe o fue actualizado por otra persona.",
  past: "El bloqueo debe terminar en una fecha y hora futuras.",
  database:
    "La base de datos no está configurada; no se realizó ningún cambio.",
  failed: "No fue posible completar la operación. Intenta nuevamente.",
};

async function loadAvailabilityData(): Promise<AvailabilityData> {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      kind: "unavailable",
      message:
        "Define DATABASE_URL y aplica las migraciones para consultar o modificar la disponibilidad. No se muestran ni guardan datos simulados.",
    };
  }

  try {
    const loadedAt = new Date();
    const [rules, blockedTimes] = await Promise.all([
      db.availabilityRule.findMany({
        where: {
          lawyerId: null,
          weekday: { in: WEEKDAYS.map(({ value }) => value) },
          active: true,
        },
        select: ruleSelect,
        orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }],
      }),
      db.blockedTime.findMany({
        where: { lawyerId: null, endsAt: { gt: loadedAt } },
        select: blockedTimeSelect,
        orderBy: { startsAt: "asc" },
        take: 100,
      }),
    ]);
    return { kind: "ready", rules, blockedTimes, loadedAt };
  } catch {
    return {
      kind: "unavailable",
      message:
        "Existe una DATABASE_URL, pero no fue posible conectar o la migración todavía no está aplicada. No se muestran datos simulados.",
    };
  }
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ruleSignature(rule: AvailabilityRuleRow) {
  return [
    rule.startMinutes,
    rule.endMinutes,
    rule.durationMinutes,
    rule.bufferMinutes,
    rule.timezone,
  ].join(":");
}

function isUniformWeekdaySchedule(rules: AvailabilityRuleRow[]) {
  if (rules.length !== WEEKDAYS.length) return false;
  if (new Set(rules.map(({ weekday }) => weekday)).size !== WEEKDAYS.length)
    return false;
  return new Set(rules.map(ruleSignature)).size === 1;
}

function formatBlockDate(value: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: DEFAULT_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatBlockTime(value: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: DEFAULT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function AvailabilityPage({ searchParams }: PageProps) {
  const [result, params] = await Promise.all([
    loadAvailabilityData(),
    searchParams,
  ]);
  const notice = firstParam(params.notice);
  const error = firstParam(params.error);

  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Calendario"
        title="Disponibilidad"
        description="Administra el horario que ofrece la agenda y los intervalos que deben permanecer cerrados para todo el despacho."
      />

      {notice && noticeMessages[notice] ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-700/15 bg-emerald-700/[0.07] px-4 py-3 text-sm text-emerald-900"
        >
          {noticeMessages[notice]}
        </p>
      ) : null}
      {error && errorMessages[error] ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-700/15 bg-red-700/[0.06] px-4 py-3 text-sm text-red-900"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {errorMessages[error]}
        </p>
      ) : null}

      {result.kind === "unavailable" ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <DatabaseZap
            className="mx-auto size-8 text-black/35"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-serif text-2xl text-[#111]">
            Disponibilidad no disponible
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            {result.message}
          </p>
        </section>
      ) : (
        <AvailabilityWorkspace
          rules={result.rules}
          blockedTimes={result.blockedTimes}
          loadedAt={result.loadedAt}
        />
      )}
    </div>
  );
}

function AvailabilityWorkspace({
  rules,
  blockedTimes,
  loadedAt,
}: {
  rules: AvailabilityRuleRow[];
  blockedTimes: BlockedTimeRow[];
  loadedAt: Date;
}) {
  const representativeRule =
    rules.find(({ weekday }) => weekday === 1) ?? rules[0];
  const uniform = isUniformWeekdaySchedule(rules);
  const hasRules = rules.length > 0;
  const today = formatDateInTimeZone(loadedAt, DEFAULT_TIME_ZONE);

  return (
    <div className="space-y-8">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_40px_rgba(20,20,20,0.035)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
                Regla global
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#111]">
                Horario de atención
              </h2>
            </div>
            <AdminStatus tone={uniform ? "green" : "gold"}>
              {uniform
                ? "L–V configurado"
                : hasRules
                  ? "Requiere unificación"
                  : "Sin configurar"}
            </AdminStatus>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-black/50">
            Una sola edición normaliza las reglas globales de lunes a viernes.
            Las reglas particulares de profesionales no se modifican.
          </p>

          <form action={saveGlobalAvailabilityAction} className="mt-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Inicio">
                <input
                  type="time"
                  name="startTime"
                  required
                  defaultValue={
                    representativeRule
                      ? minutesToTime(representativeRule.startMinutes)
                      : undefined
                  }
                  className={inputClassName}
                />
              </Field>
              <Field label="Fin">
                <input
                  type="time"
                  name="endTime"
                  required
                  defaultValue={
                    representativeRule
                      ? minutesToTime(representativeRule.endMinutes)
                      : undefined
                  }
                  className={inputClassName}
                />
              </Field>
              <Field label="Duración de cita" suffix="minutos">
                <input
                  type="number"
                  name="durationMinutes"
                  required
                  min={15}
                  max={240}
                  step={5}
                  placeholder="45"
                  defaultValue={representativeRule?.durationMinutes}
                  className={inputClassName}
                />
              </Field>
              <Field label="Buffer entre citas" suffix="minutos">
                <input
                  type="number"
                  name="bufferMinutes"
                  required
                  min={0}
                  max={120}
                  step={5}
                  placeholder="15"
                  defaultValue={representativeRule?.bufferMinutes}
                  className={inputClassName}
                />
              </Field>
            </div>
            <div className="mt-6 flex flex-col gap-4 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-black/40">
                <ShieldCheck size={14} aria-hidden="true" /> Zona horaria:
                Ciudad de México
              </p>
              <AvailabilitySubmitButton
                label="Guardar horario global"
                pendingLabel="Guardando horario…"
              />
            </div>
          </form>
        </article>

        <article className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_12px_40px_rgba(20,20,20,0.035)]">
          <div className="border-b border-black/10 p-5 sm:p-7">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
              Lectura actual
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[#111]">
              Semana operativa
            </h2>
          </div>
          <div className="divide-y divide-black/10">
            {WEEKDAYS.map((day) => {
              const dayRules = rules.filter(
                ({ weekday }) => weekday === day.value,
              );
              return (
                <div
                  key={day.value}
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[110px_1fr] sm:items-center sm:px-7"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/45">
                    {day.label}
                  </p>
                  {dayRules.length === 0 ? (
                    <p className="text-xs text-black/35">
                      Sin horario guardado
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {dayRules.map((rule) => (
                        <p key={rule.id} className="text-xs text-black/65">
                          {minutesToTime(rule.startMinutes)}–
                          {minutesToTime(rule.endMinutes)} · cita de{" "}
                          {rule.durationMinutes} min · buffer{" "}
                          {rule.bufferMinutes} min
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(340px,0.75fr)_minmax(0,1.25fr)]">
        <article className="rounded-2xl border border-black/10 bg-[#111] p-5 text-white sm:p-7">
          <div className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[#d3d3d0]">
            <Ban size={18} aria-hidden="true" />
          </div>
          <p className="mt-7 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
            Cierre excepcional
          </p>
          <h2 className="mt-2 font-serif text-3xl">Crear bloqueo global</h2>
          <p className="mt-3 text-sm leading-6 text-white/45">
            El intervalo dejará de ofrecerse para cualquier profesional en la
            agenda pública.
          </p>

          <form action={createGlobalBlockedTimeAction} className="mt-7">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <DarkField label="Fecha" fullWidth>
                <input
                  type="date"
                  name="date"
                  required
                  min={today}
                  className={darkInputClassName}
                />
              </DarkField>
              <DarkField label="Inicio">
                <input
                  type="time"
                  name="startTime"
                  required
                  className={darkInputClassName}
                />
              </DarkField>
              <DarkField label="Fin">
                <input
                  type="time"
                  name="endTime"
                  required
                  className={darkInputClassName}
                />
              </DarkField>
              <DarkField label="Motivo opcional" fullWidth>
                <input
                  type="text"
                  name="reason"
                  maxLength={180}
                  placeholder="Ej. cierre de oficina"
                  className={darkInputClassName}
                />
              </DarkField>
            </div>
            <div className="mt-6 [&_button]:w-full [&_button]:border-white [&_button]:bg-white [&_button]:text-black [&_button]:hover:bg-[#eceae5]">
              <AvailabilitySubmitButton
                label="Registrar bloqueo"
                pendingLabel="Registrando bloqueo…"
              />
            </div>
          </form>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_40px_rgba(20,20,20,0.035)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
                Vigentes y próximos
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#111]">
                Bloqueos globales
              </h2>
            </div>
            <AdminStatus tone={blockedTimes.length ? "gold" : "green"}>
              {blockedTimes.length}{" "}
              {blockedTimes.length === 1 ? "bloqueo" : "bloqueos"}
            </AdminStatus>
          </div>

          {blockedTimes.length === 0 ? (
            <div className="px-2 py-14 text-center">
              <CalendarClock
                className="mx-auto size-8 text-black/25"
                aria-hidden="true"
              />
              <h3 className="mt-4 font-serif text-2xl text-[#111]">
                Sin bloqueos próximos
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/45">
                La agenda solo considera el horario global y, cuando existan,
                las reglas particulares de cada profesional.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/10">
              {blockedTimes.map((blockedTime) => {
                const inProgress =
                  blockedTime.startsAt.getTime() <= loadedAt.getTime();
                return (
                  <div
                    key={blockedTime.id}
                    className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-serif text-xl capitalize text-[#111]">
                          {formatBlockDate(blockedTime.startsAt)}
                        </p>
                        <AdminStatus tone={inProgress ? "blue" : "gold"}>
                          {inProgress ? "En curso" : "Próximo"}
                        </AdminStatus>
                      </div>
                      <p className="mt-2 flex items-center gap-2 text-xs text-black/55">
                        <Clock3 size={14} aria-hidden="true" />
                        {formatBlockTime(blockedTime.startsAt)}–
                        {formatBlockTime(blockedTime.endsAt)} h
                      </p>
                      <p className="mt-2 text-xs leading-5 text-black/40">
                        {blockedTime.reason || "Sin motivo registrado"}
                      </p>
                    </div>
                    <form action={deleteGlobalBlockedTimeAction}>
                      <input
                        type="hidden"
                        name="blockedTimeId"
                        value={blockedTime.id}
                      />
                      <AvailabilitySubmitButton
                        label="Eliminar"
                        pendingLabel="Eliminando…"
                        variant="danger"
                        confirmation={`¿Eliminar el bloqueo del ${formatBlockDate(blockedTime.startsAt)} de ${formatBlockTime(blockedTime.startsAt)} a ${formatBlockTime(blockedTime.endsAt)}?`}
                      />
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-black/15 bg-[#f7f6f3] px-3 text-sm text-black outline-none transition focus:border-black/45 focus:ring-2 focus:ring-black/5";
const darkInputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/40 focus:ring-2 focus:ring-white/10 [color-scheme:dark]";

function Field({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-black/45">
      <span className="flex items-center justify-between gap-3">
        {label}
        {suffix ? (
          <span className="text-[9px] font-medium normal-case tracking-normal text-black/30">
            {suffix}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function DarkField({
  label,
  fullWidth = false,
  children,
}: {
  label: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`block text-[10px] font-bold uppercase tracking-[0.15em] text-white/45 ${fullWidth ? "sm:col-span-2 xl:col-span-1 2xl:col-span-2" : ""}`}
    >
      {label}
      {children}
    </label>
  );
}
