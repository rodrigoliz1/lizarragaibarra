import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  FileText,
  MessageSquareText,
  Scale,
  ShieldAlert,
} from "lucide-react";

import {
  MetricCard,
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { requireActor } from "@/server/policies";
import { getPortalSummary } from "@/server/services/portal-service";

const stageLabels: Record<string, string> = {
  INITIAL_REVIEW: "Evaluación inicial",
  ANALYSIS: "En análisis",
  STRATEGY_DEFINED: "Estrategia definida",
  NEGOTIATION: "En negociación",
  IN_PROGRESS: "En trámite",
  PENDING_AUTHORITY: "Pendiente de autoridad",
  PENDING_CLIENT: "Pendiente del cliente",
  RESOLUTION: "Resolución",
  CONCLUDED: "Concluido",
  ARCHIVED: "Archivado",
};

const appointmentStatusLabels: Record<string, string> = {
  REQUESTED: "Solicitada",
  CONFIRMED: "Confirmada",
  RESCHEDULE_REQUESTED: "Reprogramación solicitada",
  PENDING_SYNC: "Confirmación pendiente",
};

const modalityLabels: Record<string, string> = {
  IN_PERSON: "Presencial",
  VIDEO_CALL: "Videollamada",
  PHONE_CALL: "Telefónica",
};

const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Mexico_City",
});

const longDateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeZone: "America/Mexico_City",
});

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

type PortalDashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function formatCount(value: number) {
  return value.toLocaleString("es-MX", { minimumIntegerDigits: 2 });
}

function appointmentTone(status: string): "green" | "gold" | "neutral" {
  if (status === "CONFIRMED") return "green";
  if (status === "REQUESTED" || status === "RESCHEDULE_REQUESTED") {
    return "gold";
  }
  return "neutral";
}

export default async function PortalDashboardPage({
  searchParams,
}: PortalDashboardPageProps) {
  const [actor, params] = await Promise.all([requireActor(), searchParams]);
  const summary = await getPortalSummary(actor);
  const activeMatters = summary.matters.filter(
    (matter) => matter.status === "ACTIVE",
  );
  const nextAppointment = summary.upcomingAppointments[0];
  const upcomingActions = summary.matters
    .filter((matter) => matter.nextActionPublic)
    .sort((left, right) => {
      if (!left.nextActionAt && !right.nextActionAt) return 0;
      if (!left.nextActionAt) return 1;
      if (!right.nextActionAt) return -1;
      return (
        new Date(left.nextActionAt).getTime() -
        new Date(right.nextActionAt).getTime()
      );
    })
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {params.aviso === "sin-acceso" ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-[#d3d3d0]/25 bg-[#d3d3d0]/10 px-4 py-3 text-xs leading-5 text-[#f7f7f5]"
          role="alert"
        >
          <ShieldAlert
            size={16}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          Su cuenta no tiene permiso para ingresar al centro administrativo. La
          sesión del portal continúa activa.
        </div>
      ) : null}

      <SectionHeading
        eyebrow="Acceso autorizado"
        title="Su panorama legal"
        description="Una lectura ejecutiva de los asuntos y próximos hitos visibles para su cuenta."
        action={
          <Link
            href="/agendar?origen=portal"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            Solicitar cita
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores del expediente"
      >
        <MetricCard
          label="Asuntos activos"
          value={formatCount(activeMatters.length)}
          note={
            activeMatters.length
              ? "Con seguimiento vigente"
              : "Sin asuntos activos"
          }
          icon={BriefcaseBusiness}
        />
        <MetricCard
          label="Próxima cita"
          value={
            nextAppointment
              ? shortDateFormatter
                  .format(new Date(nextAppointment.startAt))
                  .replace(".", "")
                  .toLocaleUpperCase("es-MX")
              : "—"
          }
          note={
            nextAppointment
              ? `${timeFormatter.format(new Date(nextAppointment.startAt))} · ${modalityLabels[nextAppointment.modality] ?? nextAppointment.modality}`
              : "Sin citas próximas"
          }
          icon={CalendarDays}
        />
        <MetricCard
          label="Asuntos visibles"
          value={formatCount(summary.matters.length)}
          note="Expedientes autorizados"
          icon={FileText}
        />
        <MetricCard
          label="Notificaciones"
          value={formatCount(summary.unreadNotifications)}
          note={
            summary.unreadNotifications
              ? "Pendientes de lectura"
              : "Sin avisos pendientes"
          }
          icon={MessageSquareText}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Asuntos visibles
              </p>
              <h2 className="mt-1 font-serif text-2xl text-white">
                Estado actual
              </h2>
            </div>
            <Link
              href="/portal/panel/asuntos"
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d3d3d0] hover:text-[#ffffff]"
            >
              Ver todos
            </Link>
          </div>

          {summary.matters.length ? (
            <div className="divide-y divide-white/10">
              {summary.matters.slice(0, 3).map((matter) => (
                <article key={matter.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#d3d3d0]">
                          {matter.reference}
                        </span>
                        <StatusPill
                          tone={
                            matter.status === "ACTIVE" ? "green" : "neutral"
                          }
                        >
                          {stageLabels[matter.stage] ?? matter.stage}
                        </StatusPill>
                      </div>
                      <h3 className="mt-3 font-serif text-2xl text-white">
                        {matter.title}
                      </h3>
                    </div>
                    <p className="text-xs text-white/30">
                      Actualizado {formatDate(matter.updatedAt)}
                    </p>
                  </div>
                  <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5">
                    <p className="text-white/45">
                      <span className="text-white/70">Siguiente:</span>{" "}
                      {matter.nextActionPublic ??
                        "Sin actuación pública pendiente."}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <p className="text-white/30">
                        {matter.nextActionAt
                          ? formatDate(matter.nextActionAt)
                          : "Fecha por confirmar"}
                      </p>
                      <Link
                        className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#d3d3d0] hover:text-white"
                        href={`/portal/panel/asuntos/${matter.id}`}
                      >
                        Abrir asunto
                        <ArrowRight aria-hidden="true" className="size-3" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-5 sm:p-6">
              <EmptyState
                description="No hay asuntos visibles para esta cuenta. Si esperaba información, contacte a su equipo responsable."
                icon={BriefcaseBusiness}
                title="Sin asuntos asociados"
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {nextAppointment ? (
            <article className="rounded-2xl border border-[#d3d3d0]/25 bg-[linear-gradient(145deg,rgba(211,211,208,0.12),rgba(255,255,255,0.025))] p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-10 place-items-center rounded-full border border-[#d3d3d0]/25 text-[#f7f7f5]">
                  <CalendarDays size={17} aria-hidden="true" />
                </span>
                <StatusPill tone={appointmentTone(nextAppointment.status)}>
                  {appointmentStatusLabels[nextAppointment.status] ??
                    nextAppointment.status}
                </StatusPill>
              </div>
              <p className="mt-8 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#d3d3d0]">
                Próxima cita
              </p>
              <h2 className="mt-2 font-serif text-3xl">
                {longDateFormatter.format(new Date(nextAppointment.startAt))}
              </h2>
              <p className="mt-2 text-sm text-white/55">
                {nextAppointment.practiceArea.name}
              </p>
              <div className="mt-6 space-y-2 border-t border-white/10 pt-5 text-xs text-white/40">
                <p>
                  {timeFormatter.format(new Date(nextAppointment.startAt))} h ·{" "}
                  {modalityLabels[nextAppointment.modality] ??
                    nextAppointment.modality}
                </p>
                <p>
                  Profesional ·{" "}
                  {nextAppointment.lawyer?.displayName ?? "Por asignar"}
                </p>
              </div>
              <Link
                href="/portal/panel/citas"
                className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 hover:text-white"
              >
                Ver detalle <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </article>
          ) : (
            <article className="rounded-2xl border border-[#d3d3d0]/25 bg-[linear-gradient(145deg,rgba(211,211,208,0.12),rgba(255,255,255,0.025))] p-6">
              <span className="grid size-10 place-items-center rounded-full border border-[#d3d3d0]/25 text-[#f7f7f5]">
                <CalendarDays size={17} aria-hidden="true" />
              </span>
              <p className="mt-8 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#d3d3d0]">
                Próxima cita
              </p>
              <h2 className="mt-2 font-serif text-3xl">Sin cita programada</h2>
              <p className="mt-3 text-sm leading-6 text-white/45">
                No existen citas futuras asociadas con esta cuenta.
              </p>
              <Link
                href="/agendar?origen=portal"
                className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 hover:text-white"
              >
                Solicitar cita <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </article>
          )}

          <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <span className="grid size-10 place-items-center rounded-full border border-white/10 text-[#d3d3d0]">
              <Scale size={17} aria-hidden="true" />
            </span>
            <p className="mt-6 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Canal seguro
            </p>
            <h2 className="mt-2 font-serif text-2xl">
              Equipo LIZÁRRAGA & IBARRA ABOGADOS
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/40">
              La comunicación se registra dentro del asunto autorizado para
              mantener su contexto y trazabilidad.
            </p>
            <Link
              href="/portal/panel/mensajes"
              className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d3d3d0] hover:text-[#ffffff]"
            >
              Ver mensajes <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.025]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Seguimiento
            </p>
            <h2 className="mt-1 font-serif text-2xl">Próximos pasos</h2>
          </div>
          <Link
            href="/portal/panel/actividad"
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d3d3d0] hover:text-[#ffffff]"
          >
            Ver cronología
          </Link>
        </div>

        {upcomingActions.length ? (
          <div className="grid gap-px bg-white/10 md:grid-cols-3">
            {upcomingActions.map((matter) => (
              <article key={matter.id} className="bg-[#0b0b0b] p-5 sm:p-6">
                <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
                  <Clock3
                    size={13}
                    className="text-[#d3d3d0]"
                    aria-hidden="true"
                  />
                  {matter.nextActionAt
                    ? formatDate(matter.nextActionAt)
                    : "Fecha por confirmar"}
                </div>
                <h3 className="mt-4 text-sm font-semibold leading-6 text-white/85">
                  {matter.nextActionPublic}
                </h3>
                <p className="mt-2 text-xs leading-5 text-white/40">
                  {matter.title}
                </p>
                <Link
                  href={`/portal/panel/asuntos/${matter.id}`}
                  className="mt-5 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#d3d3d0] hover:text-white"
                >
                  {matter.reference}
                  <ArrowRight aria-hidden="true" className="size-3" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState
              description="Aún no hay próximos pasos públicos registrados para los asuntos visibles."
              icon={Clock3}
              title="Sin próximos pasos registrados"
            />
          </div>
        )}
      </section>
    </div>
  );
}
