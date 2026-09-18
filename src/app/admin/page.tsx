import {
  BriefcaseBusiness,
  CalendarCheck2,
  ClipboardList,
  DatabaseZap,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import {
  AdminHeading,
  AdminMetric,
  AdminStatus,
} from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const appointmentStatus = {
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
  PENDING_SYNC: { label: "Sincronización", tone: "gold" },
} as const;

const matterStageLabels = {
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
} as const;

async function loadDashboard() {
  if (!process.env.DATABASE_URL?.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL es obligatoria para la administración.");
    }
    return {
      kind: "unavailable" as const,
      message:
        "La base de datos no está configurada. El resumen no utiliza métricas de demostración.",
    };
  }

  const now = new Date();
  const nextSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  try {
    const [
      appointmentsThisWeek,
      appointmentsToConfirm,
      activeMatters,
      mattersWithUpcomingMilestone,
      activeClients,
      activeLawyers,
      unreadMessages,
      pendingArticles,
      failedEmails,
      newSubmissions,
      upcomingAppointments,
      upcomingMatters,
    ] = await Promise.all([
      db.appointment.count({
        where: {
          startAt: { gte: now, lt: nextSevenDays },
          status: {
            in: [
              "REQUESTED",
              "CONFIRMED",
              "RESCHEDULE_REQUESTED",
              "PENDING_SYNC",
            ],
          },
        },
      }),
      db.appointment.count({
        where: {
          startAt: { gte: now },
          status: { in: ["REQUESTED", "PENDING_SYNC"] },
        },
      }),
      db.matter.count({ where: { status: "ACTIVE" } }),
      db.matter.count({
        where: {
          status: "ACTIVE",
          nextActionAt: { gte: now, lt: nextSevenDays },
        },
      }),
      db.clientProfile.count({ where: { user: { status: "ACTIVE" } } }),
      db.lawyerProfile.count({
        where: { active: true, user: { status: "ACTIVE" } },
      }),
      db.message.count({ where: { readAt: null } }),
      db.article.count({
        where: {
          status: { in: ["SUBMITTED", "CHANGES_REQUESTED", "APPROVED"] },
        },
      }),
      db.emailOutbox.count({
        where: { status: { in: ["FAILED", "DEAD_LETTER"] } },
      }),
      db.contactSubmission.count({ where: { status: "NEW" } }),
      db.appointment.findMany({
        where: {
          startAt: { gte: now },
          status: {
            in: [
              "REQUESTED",
              "CONFIRMED",
              "RESCHEDULE_REQUESTED",
              "PENDING_SYNC",
            ],
          },
        },
        select: {
          id: true,
          reference: true,
          fullName: true,
          startAt: true,
          timezone: true,
          status: true,
          practiceArea: { select: { name: true } },
          lawyer: { select: { displayName: true } },
        },
        orderBy: { startAt: "asc" },
        take: 3,
      }),
      db.matter.findMany({
        where: { status: "ACTIVE", nextActionAt: { gte: now } },
        select: {
          id: true,
          reference: true,
          title: true,
          stage: true,
          nextActionAt: true,
          nextActionPublic: true,
          client: {
            select: { company: true, user: { select: { name: true } } },
          },
          assignments: {
            orderBy: { assignedAt: "asc" },
            take: 1,
            select: { lawyer: { select: { displayName: true } } },
          },
        },
        orderBy: { nextActionAt: "asc" },
        take: 3,
      }),
    ]);

    return {
      kind: "ready" as const,
      metrics: {
        appointmentsThisWeek,
        appointmentsToConfirm,
        activeMatters,
        mattersWithUpcomingMilestone,
        activeClients,
        activeLawyers,
        unreadMessages,
        pendingArticles,
        failedEmails,
        newSubmissions,
      },
      upcomingAppointments,
      upcomingMatters,
    };
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error("No fue posible cargar el resumen administrativo.");
    }
    return {
      kind: "unavailable" as const,
      message:
        "Existe una DATABASE_URL, pero no fue posible conectar o la migración aún no está aplicada.",
    };
  }
}

function formatDate(value: Date, timezone = "America/Mexico_City") {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
  }).format(value);
}

function formatTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function AdminDashboardPage() {
  const result = await loadDashboard();

  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Centro de control"
        title="Visión general"
        description="Lectura ejecutiva de datos operativos registrados en la plataforma."
      />

      {result.kind === "unavailable" ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <DatabaseZap
            className="mx-auto size-8 text-black/35"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-serif text-2xl">Datos no disponibles</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            {result.message}
          </p>
        </section>
      ) : (
        <>
          <section
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Indicadores de operación"
          >
            <AdminMetric
              label="Citas próximos 7 días"
              value={result.metrics.appointmentsThisWeek.toLocaleString(
                "es-MX",
              )}
              note={`${result.metrics.appointmentsToConfirm.toLocaleString("es-MX")} por confirmar`}
              icon={CalendarCheck2}
            />
            <AdminMetric
              label="Asuntos activos"
              value={result.metrics.activeMatters.toLocaleString("es-MX")}
              note={`${result.metrics.mattersWithUpcomingMilestone.toLocaleString("es-MX")} con hito en 7 días`}
              icon={BriefcaseBusiness}
            />
            <AdminMetric
              label="Clientes activos"
              value={result.metrics.activeClients.toLocaleString("es-MX")}
              note="Perfiles con cuenta activa"
              icon={UsersRound}
            />
            <AdminMetric
              label="Formularios nuevos"
              value={result.metrics.newSubmissions.toLocaleString("es-MX")}
              note="Pendientes de revisión"
              icon={ClipboardList}
            />
            <AdminMetric
              label="Abogados activos"
              value={result.metrics.activeLawyers.toLocaleString("es-MX")}
              note="Cuentas profesionales activas"
              icon={UsersRound}
            />
            <AdminMetric
              label="Mensajes sin leer"
              value={result.metrics.unreadMessages.toLocaleString("es-MX")}
              note="En conversaciones autorizadas"
              icon={ClipboardList}
            />
            <AdminMetric
              label="Artículos pendientes"
              value={result.metrics.pendingArticles.toLocaleString("es-MX")}
              note="En flujo editorial"
              icon={ClipboardList}
            />
            <AdminMetric
              label="Correos fallidos"
              value={result.metrics.failedEmails.toLocaleString("es-MX")}
              note="Disponibles para reintento"
              icon={DatabaseZap}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_12px_40px_rgba(20,20,20,0.035)]">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-5 sm:px-6">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/35">
                    Agenda inmediata
                  </p>
                  <h2 className="mt-1 font-serif text-2xl">Próximas citas</h2>
                </div>
                <Link
                  href="/admin/citas"
                  className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#292929] hover:text-black"
                >
                  Ver agenda
                </Link>
              </div>
              <div className="divide-y divide-black/10">
                {result.upcomingAppointments.length ? (
                  result.upcomingAppointments.map((appointment) => {
                    const presentation = appointmentStatus[appointment.status];
                    return (
                      <article
                        key={appointment.id}
                        className="grid gap-3 px-5 py-4 sm:grid-cols-[90px_1fr_auto] sm:items-center sm:px-6"
                      >
                        <div>
                          <p className="font-serif text-xl">
                            {formatTime(
                              appointment.startAt,
                              appointment.timezone,
                            )}
                          </p>
                          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35">
                            {formatDate(
                              appointment.startAt,
                              appointment.timezone,
                            )}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {appointment.fullName}
                          </p>
                          <p className="mt-1 truncate text-xs text-black/40">
                            {appointment.practiceArea.name} ·{" "}
                            {appointment.lawyer?.displayName ?? "Sin asignar"}
                          </p>
                        </div>
                        <AdminStatus tone={presentation.tone}>
                          {presentation.label}
                        </AdminStatus>
                      </article>
                    );
                  })
                ) : (
                  <p className="px-6 py-10 text-center text-sm text-black/40">
                    No hay citas próximas registradas.
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#111] text-white shadow-[0_12px_40px_rgba(20,20,20,0.08)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-6">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                    Prioridades
                  </p>
                  <h2 className="mt-1 font-serif text-2xl">Hitos próximos</h2>
                </div>
                <Link
                  href="/admin/asuntos"
                  className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#d3d3d0] hover:text-white"
                >
                  Ver asuntos
                </Link>
              </div>
              <div className="divide-y divide-white/10">
                {result.upcomingMatters.length ? (
                  result.upcomingMatters.map((matter) => (
                    <article
                      key={matter.id}
                      className="flex items-center gap-4 px-5 py-4 sm:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#d3d3d0]">
                          {matter.reference}
                        </p>
                        <p className="mt-1 truncate text-sm text-white/80">
                          {matter.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-white/35">
                          {matter.client.company ?? matter.client.user.name} ·{" "}
                          {matter.assignments[0]?.lawyer.displayName ??
                            "Sin responsable"}
                        </p>
                        <p className="mt-1 text-[10px] text-white/35">
                          {matterStageLabels[matter.stage]}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-xl">
                          {matter.nextActionAt
                            ? formatDate(matter.nextActionAt)
                            : "—"}
                        </p>
                        <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/30">
                          Próximo hito
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="px-6 py-10 text-center text-sm text-white/35">
                    No hay hitos futuros registrados.
                  </p>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
