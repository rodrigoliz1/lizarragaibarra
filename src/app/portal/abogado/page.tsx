import {
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";

import {
  MetricCard,
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

export default async function LawyerDashboard() {
  const actor = await requireActor(["LAWYER"]);
  const now = new Date();
  const [matters, appointments, unread, articles, recent] = await Promise.all([
    db.matter.count({
      where: {
        assignments: { some: { lawyerId: actor.lawyerProfileId! } },
        status: "ACTIVE",
      },
    }),
    db.appointment.count({
      where: {
        lawyerId: actor.lawyerProfileId,
        startAt: { gte: now },
        status: { in: ["LAWYER_REVIEW", "PROPOSED_BY_CLIENT", "CONFIRMED"] },
      },
    }),
    db.notification.count({ where: { recipientId: actor.id, readAt: null } }),
    db.article.count({
      where: {
        authorId: actor.id,
        status: { in: ["DRAFT", "SUBMITTED", "CHANGES_REQUESTED"] },
      },
    }),
    db.matter.findMany({
      where: { assignments: { some: { lawyerId: actor.lawyerProfileId! } } },
      select: {
        id: true,
        reference: true,
        title: true,
        stage: true,
        nextActionAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={
          actor.lawyerRank === "PARTNER"
            ? "Portal de socio"
            : "Portal de asociado"
        }
        title="Panorama profesional"
        description="Asuntos, agenda y trabajo editorial autorizados para su cuenta individual."
        action={
          actor.lawyerRank === "PARTNER" ? (
            <Link
              href="/portal/abogado/usuarios"
              className="rounded-full border border-white/15 px-5 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-white/65"
            >
              Invitar cuenta
            </Link>
          ) : undefined
        }
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Asuntos activos"
          value={String(matters).padStart(2, "0")}
          note="Asignados o supervisados"
          icon={BriefcaseBusiness}
        />
        <MetricCard
          label="Agenda pendiente"
          value={String(appointments).padStart(2, "0")}
          note="Por revisar o próximas"
          icon={CalendarDays}
        />
        <MetricCard
          label="Notificaciones"
          value={String(unread).padStart(2, "0")}
          note="Pendientes de lectura"
          icon={MessageSquareText}
        />
        <MetricCard
          label="Trabajo editorial"
          value={String(articles).padStart(2, "0")}
          note="Borradores y revisiones"
          icon={BookOpenText}
        />
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.025]">
        <div className="border-b border-white/10 p-6">
          <p className="eyebrow text-white/35">Actividad prioritaria</p>
          <h2 className="mt-2 font-serif text-3xl">Asuntos recientes</h2>
        </div>
        <div className="divide-y divide-white/10">
          {recent.map((matter) => (
            <Link
              key={matter.id}
              href={`/portal/abogado/asuntos/${matter.id}`}
              className="flex items-center justify-between gap-4 p-6 hover:bg-white/[0.025]"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#d3d3d0]">
                  {matter.reference}
                </p>
                <p className="mt-2 font-serif text-xl">{matter.title}</p>
              </div>
              <StatusPill tone="neutral">
                {matter.stage.replaceAll("_", " ")}
              </StatusPill>
            </Link>
          ))}
          {!recent.length ? (
            <p className="p-8 text-sm text-white/40">
              No hay asuntos asignados.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
