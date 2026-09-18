import { ArrowRight, CalendarDays, MapPin, Phone, Video } from "lucide-react";
import Link from "next/link";
import { ProposalActions } from "@/components/appointments/proposal-actions";
import { ProposalForm } from "@/components/appointments/proposal-form";

import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { EmptyState } from "@/components/ui/empty-state";
import {
  canRespondToAppointmentProposal,
  requireActor,
} from "@/server/policies";
import { getPortalSummary } from "@/server/services/portal-service";

const modality = {
  IN_PERSON: { label: "Presencial", icon: MapPin },
  VIDEO_CALL: { label: "Videollamada", icon: Video },
  PHONE_CALL: { label: "Telefónica", icon: Phone },
} as const;

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const actor = await requireActor(["CLIENT"]);
  const summary = await getPortalSummary(actor);
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Agenda"
        title="Citas"
        description="Próximas conversaciones registradas para su cuenta."
        action={
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-black"
            href={`/agendar?origen=portal${summary.matters[0]?.id ? `&asunto=${summary.matters[0].id}` : ""}`}
          >
            Solicitar nueva cita{" "}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        }
      />
      {summary.upcomingAppointments.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {summary.upcomingAppointments.map((appointment) => {
            const mode = modality[appointment.modality];
            const Icon = mode.icon;
            const date = new Date(appointment.startAt);
            return (
              <article
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:p-8"
                key={appointment.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-full border border-white/15 text-paper-muted">
                    <CalendarDays aria-hidden="true" className="size-4.5" />
                  </span>
                  <StatusPill
                    tone={
                      appointment.status === "CONFIRMED" ? "green" : "neutral"
                    }
                  >
                    {appointment.status.replaceAll("_", " ")}
                  </StatusPill>
                </div>
                <p className="eyebrow mt-9 text-paper-quiet">
                  {appointment.reference}
                </p>
                <h2 className="mt-3 font-serif text-4xl">
                  {new Intl.DateTimeFormat("es-MX", {
                    dateStyle: "long",
                    timeZone: "America/Mexico_City",
                  }).format(date)}
                </h2>
                <p className="mt-3 text-sm text-white/55">
                  {appointment.practiceArea.name}
                </p>
                <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 text-xs text-white/45 sm:grid-cols-2">
                  <p>
                    {new Intl.DateTimeFormat("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Mexico_City",
                    }).format(date)}{" "}
                    h
                  </p>
                  <p className="flex items-center gap-2">
                    <Icon
                      aria-hidden="true"
                      className="size-3.5 text-paper-muted"
                    />{" "}
                    {mode.label}
                  </p>
                  <p className="sm:col-span-2">
                    Profesional:{" "}
                    {appointment.lawyer?.displayName ?? "Por asignar"}
                  </p>
                </div>
                {appointment.proposals[0] ? (
                  <div className="mt-5 rounded-xl border border-white/10 p-4">
                    <p className="text-xs text-white/45">
                      Propuesta vigente:{" "}
                      {new Intl.DateTimeFormat("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "America/Mexico_City",
                      }).format(new Date(appointment.proposals[0].startAt))}
                    </p>
                    {canRespondToAppointmentProposal(
                      actor,
                      appointment.proposals[0].proposerSide,
                    ) ? (
                      <ProposalActions
                        appointmentId={appointment.id}
                        proposalId={appointment.proposals[0].id}
                      />
                    ) : (
                      <p className="mt-3 text-xs text-white/30">
                        Esperando respuesta del profesional.
                      </p>
                    )}
                  </div>
                ) : null}
                {appointment.status !== "CONFIRMED" &&
                !["CANCELLED", "DECLINED", "COMPLETED"].includes(
                  appointment.status,
                ) ? (
                  <ProposalForm appointmentId={appointment.id} />
                ) : null}
                {appointment.status === "CONFIRMED" ? (
                  <a
                    href={`/api/portal/citas/${appointment.id}/ics`}
                    className="mt-5 inline-flex text-[10px] uppercase tracking-[0.16em] text-paper-muted"
                  >
                    Descargar invitación ICS
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          description="No existen citas futuras asociadas a esta cuenta."
          icon={CalendarDays}
          title="Sin citas próximas"
        />
      )}
    </div>
  );
}
