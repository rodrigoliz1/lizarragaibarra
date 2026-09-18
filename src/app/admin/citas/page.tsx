import type { Prisma } from "@prisma/client";
import { CalendarRange, CircleAlert, Clock3, DatabaseZap } from "lucide-react";
import Link from "next/link";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

import {
  assignAppointmentLawyerAction,
  cancelAppointmentAction,
  markAppointmentForRescheduleAction,
  saveAppointmentInternalNotesAction,
} from "./actions";
import { AppointmentActionButton } from "./appointment-action-button";

export const dynamic = "force-dynamic";

const appointmentSelect = {
  id: true,
  reference: true,
  fullName: true,
  email: true,
  phone: true,
  company: true,
  modality: true,
  startAt: true,
  endAt: true,
  timezone: true,
  status: true,
  description: true,
  calendarSyncStatus: true,
  calendarSyncError: true,
  internalNotes: true,
  createdAt: true,
  practiceArea: { select: { name: true } },
  lawyer: { select: { id: true, displayName: true, active: true } },
  changeRequests: {
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { type: true, requestedStartAt: true, reason: true },
  },
} satisfies Prisma.AppointmentSelect;

type AppointmentRow = Prisma.AppointmentGetPayload<{
  select: typeof appointmentSelect;
}>;

type ActiveLawyer = {
  id: string;
  displayName: string;
  position: string;
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statusPresentation = {
  REQUESTED: { label: "Solicitada", tone: "gold" },
  LAWYER_REVIEW: { label: "Revisión abogado", tone: "gold" },
  CLIENT_REVIEW: { label: "Revisión cliente", tone: "blue" },
  PROPOSED_BY_LAWYER: { label: "Propuesta del abogado", tone: "blue" },
  PROPOSED_BY_CLIENT: { label: "Propuesta del cliente", tone: "gold" },
  CONFIRMED: { label: "Confirmada", tone: "green" },
  DECLINED: { label: "Rechazada", tone: "neutral" },
  RESCHEDULE_REQUESTED: { label: "Reprogramación", tone: "blue" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
  COMPLETED: { label: "Concluida", tone: "green" },
  NO_SHOW: { label: "No asistió", tone: "neutral" },
  PENDING_SYNC: { label: "Sincronización pendiente", tone: "gold" },
} as const;

const modalityLabels = {
  IN_PERSON: "Presencial",
  VIDEO_CALL: "Videollamada",
  PHONE_CALL: "Telefónica",
} as const;

const noticeMessages: Record<string, string> = {
  confirmed: "La cita quedó confirmada y el cambio fue auditado.",
  cancelled: "La cita fue cancelada y sus intervalos quedaron liberados.",
  reschedule: "La cita quedó marcada para reprogramación.",
  assigned: "El profesional responsable fue actualizado.",
  notes: "Las notas internas fueron guardadas.",
};

const errorMessages: Record<string, string> = {
  invalid: "La cita seleccionada no es válida.",
  unavailable:
    "La cita ya no admite esa operación, el profesional no está disponible o el registro cambió.",
  "invalid-notes":
    "Las notas internas no son válidas o superan 4,000 caracteres.",
  failed: "No fue posible completar la operación. Intenta nuevamente.",
};

async function loadAppointments(): Promise<
  | {
      kind: "ready";
      appointments: AppointmentRow[];
      activeLawyers: ActiveLawyer[];
    }
  | { kind: "unavailable"; message: string }
> {
  if (!process.env.DATABASE_URL?.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "DATABASE_URL es obligatoria para la administración de citas.",
      );
    }
    return {
      kind: "unavailable",
      message:
        "La base de datos no está configurada en este entorno. No se muestran datos simulados.",
    };
  }

  try {
    const [appointments, activeLawyers] = await Promise.all([
      db.appointment.findMany({
        select: appointmentSelect,
        orderBy: [{ startAt: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
      db.lawyerProfile.findMany({
        where: { active: true },
        select: { id: true, displayName: true, position: true },
        orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
      }),
    ]);
    return { kind: "ready", appointments, activeLawyers };
  } catch {
    if (process.env.NODE_ENV === "production")
      throw new Error("No fue posible consultar las citas.");
    return {
      kind: "unavailable",
      message:
        "Existe una DATABASE_URL, pero no fue posible conectar o la migración aún no está aplicada.",
    };
  }
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatAppointmentDate(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatAppointmentTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function AdminAppointmentsPage({
  searchParams,
}: PageProps) {
  const [result, params] = await Promise.all([
    loadAppointments(),
    searchParams,
  ]);
  const notice = firstParam(params.notice);
  const error = firstParam(params.error);

  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Agenda"
        title="Citas"
        description="Solicitudes reales registradas desde la agenda y operaciones administrativas auditadas."
        action={
          <Link
            href="/admin/disponibilidad"
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-black/60 hover:border-black/20"
          >
            <CalendarRange size={14} aria-hidden="true" /> Revisar
            disponibilidad
          </Link>
        }
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
            Datos no disponibles
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            {result.message}
          </p>
        </section>
      ) : result.appointments.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <Clock3 className="mx-auto size-8 text-black/35" aria-hidden="true" />
          <h2 className="mt-5 font-serif text-2xl text-[#111]">
            Sin citas registradas
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            Las solicitudes enviadas desde la agenda aparecerán aquí. No se
            utilizan registros de demostración.
          </p>
        </section>
      ) : (
        <section aria-label="Citas registradas" className="space-y-4">
          {result.appointments.map((appointment) => {
            const presentation = statusPresentation[appointment.status];
            const pendingChange = appointment.changeRequests[0];
            const canChange = !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(
              appointment.status,
            );

            return (
              <article
                key={appointment.id}
                className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_40px_rgba(20,20,20,0.025)] sm:p-6"
              >
                <div className="grid gap-6 xl:grid-cols-[180px_minmax(0,1fr)_280px]">
                  <div>
                    <p className="font-serif text-3xl text-[#111]">
                      {formatAppointmentTime(
                        appointment.startAt,
                        appointment.timezone,
                      )}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">
                      {formatAppointmentDate(
                        appointment.startAt,
                        appointment.timezone,
                      )}
                    </p>
                    <p className="mt-3 break-all text-[9px] uppercase tracking-[0.12em] text-black/30">
                      {appointment.reference}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-2xl text-[#111]">
                        {appointment.fullName}
                      </h2>
                      <AdminStatus tone={presentation.tone}>
                        {presentation.label}
                      </AdminStatus>
                    </div>
                    <p className="mt-2 text-sm text-black/55">
                      {appointment.practiceArea.name} ·{" "}
                      {modalityLabels[appointment.modality]}
                    </p>
                    <p className="mt-1 text-xs text-black/40">
                      Responsable:{" "}
                      {appointment.lawyer?.displayName ??
                        "Asignación pendiente"}
                      {appointment.lawyer && !appointment.lawyer.active
                        ? " · perfil inactivo"
                        : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-black/50">
                      <a
                        className="hover:text-black"
                        href={`mailto:${appointment.email}`}
                      >
                        {appointment.email}
                      </a>
                      <a
                        className="hover:text-black"
                        href={`tel:${appointment.phone}`}
                      >
                        {appointment.phone}
                      </a>
                      {appointment.company ? (
                        <span>{appointment.company}</span>
                      ) : null}
                    </div>
                    <details className="mt-4 rounded-xl bg-black/[0.025] px-4 py-3 text-xs leading-5 text-black/55">
                      <summary className="cursor-pointer font-semibold text-black/60">
                        Ver descripción general
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap">
                        {appointment.description}
                      </p>
                    </details>
                    {pendingChange?.type === "RESCHEDULE" ? (
                      <p className="mt-3 rounded-lg border border-sky-700/10 bg-sky-700/[0.05] px-3 py-2 text-xs text-sky-900">
                        Reprogramación solicitada
                        {pendingChange.requestedStartAt
                          ? ` para ${formatAppointmentDate(
                              pendingChange.requestedStartAt,
                              appointment.timezone,
                            )} a las ${formatAppointmentTime(
                              pendingChange.requestedStartAt,
                              appointment.timezone,
                            )}`
                          : ""}
                        {pendingChange.reason
                          ? ` · ${pendingChange.reason}`
                          : ""}
                      </p>
                    ) : null}
                    {appointment.calendarSyncStatus === "FAILED" ? (
                      <p className="mt-3 text-xs text-red-800">
                        Calendario externo pendiente de revisión
                        {appointment.calendarSyncError
                          ? `: ${appointment.calendarSyncError}`
                          : "."}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 xl:border-l xl:border-black/10 xl:pl-5">
                    {result.activeLawyers.length > 0 ? (
                      <form
                        action={assignAppointmentLawyerAction}
                        className="mb-2 space-y-2 border-b border-black/10 pb-4"
                      >
                        <input
                          type="hidden"
                          name="appointmentId"
                          value={appointment.id}
                        />
                        <label
                          htmlFor={`lawyer-${appointment.id}`}
                          className="block text-[9px] font-bold uppercase tracking-[0.14em] text-black/45"
                        >
                          Profesional responsable
                        </label>
                        <select
                          id={`lawyer-${appointment.id}`}
                          name="lawyerId"
                          required
                          defaultValue={
                            appointment.lawyer?.active
                              ? appointment.lawyer.id
                              : ""
                          }
                          className="min-h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-xs text-black/70 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/15"
                        >
                          <option value="" disabled>
                            Seleccionar profesional activo
                          </option>
                          {result.activeLawyers.map((lawyer) => (
                            <option key={lawyer.id} value={lawyer.id}>
                              {lawyer.displayName} · {lawyer.position}
                            </option>
                          ))}
                        </select>
                        <AppointmentActionButton
                          label={
                            appointment.lawyer?.active
                              ? "Actualizar responsable"
                              : "Asignar responsable"
                          }
                          pendingLabel="Asignando…"
                          variant="secondary"
                        />
                      </form>
                    ) : (
                      <p className="mb-2 border-b border-black/10 pb-4 text-xs leading-5 text-black/40">
                        No hay profesionales activos disponibles para asignar.
                      </p>
                    )}
                    {canChange &&
                    appointment.status !== "RESCHEDULE_REQUESTED" ? (
                      <form action={markAppointmentForRescheduleAction}>
                        <input
                          type="hidden"
                          name="appointmentId"
                          value={appointment.id}
                        />
                        <AppointmentActionButton
                          label="Marcar para reprogramar"
                          pendingLabel="Actualizando…"
                          variant="secondary"
                        />
                      </form>
                    ) : null}
                    {canChange ? (
                      <form action={cancelAppointmentAction}>
                        <input
                          type="hidden"
                          name="appointmentId"
                          value={appointment.id}
                        />
                        <AppointmentActionButton
                          label="Cancelar cita"
                          pendingLabel="Cancelando…"
                          variant="danger"
                          confirmation="¿Cancelar esta cita y liberar definitivamente su horario?"
                        />
                      </form>
                    ) : (
                      <p className="text-xs leading-5 text-black/35">
                        Esta cita ya no admite operaciones.
                      </p>
                    )}
                  </div>
                </div>

                <details className="mt-6 border-t border-black/10 pt-5">
                  <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.14em] text-black/50 hover:text-black/75">
                    Notas internas y confidenciales
                  </summary>
                  <form
                    action={saveAppointmentInternalNotesAction}
                    className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end"
                  >
                    <input
                      type="hidden"
                      name="appointmentId"
                      value={appointment.id}
                    />
                    <div>
                      <label
                        htmlFor={`internal-notes-${appointment.id}`}
                        className="mb-2 block text-xs font-semibold text-black/60"
                      >
                        Notas visibles únicamente para administración
                      </label>
                      <textarea
                        id={`internal-notes-${appointment.id}`}
                        name="internalNotes"
                        maxLength={4000}
                        defaultValue={appointment.internalNotes ?? ""}
                        rows={4}
                        aria-describedby={`internal-notes-help-${appointment.id}`}
                        className="w-full resize-y rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm leading-6 text-black/70 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/15"
                      />
                      <p
                        id={`internal-notes-help-${appointment.id}`}
                        className="mt-1 text-[10px] leading-4 text-black/35"
                      >
                        Máximo 4,000 caracteres. Este contenido no se incluye en
                        el portal del cliente ni en la auditoría.
                      </p>
                    </div>
                    <AppointmentActionButton
                      label="Guardar notas internas"
                      pendingLabel="Guardando…"
                      variant="secondary"
                    />
                  </form>
                </details>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
