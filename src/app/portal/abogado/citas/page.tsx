import { ProposalActions } from "@/components/appointments/proposal-actions";
import { ProposalForm } from "@/components/appointments/proposal-form";
import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import {
  canRespondToAppointmentProposal,
  requireActor,
} from "@/server/policies";

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

export default async function LawyerAppointmentsPage() {
  const actor = await requireActor(["LAWYER"]);
  const appointments = await db.appointment.findMany({
    where: { lawyerId: actor.lawyerProfileId },
    include: {
      practiceArea: { select: { name: true } },
      proposals: {
        where: { status: "PENDING" },
        include: { hold: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { startAt: "asc" },
    take: 100,
  });
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Agenda negociable"
        title="Citas"
        description="Cada horario queda confirmado únicamente después de una aceptación inequívoca."
      />
      <section className="space-y-4">
        {appointments.map((appointment) => {
          const proposal = appointment.proposals[0];
          return (
            <article
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-6"
              key={appointment.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#d3d3d0]">
                    {appointment.reference}
                  </p>
                  <h2 className="mt-2 font-serif text-2xl">
                    {appointment.fullName}
                  </h2>
                  <p className="mt-2 text-sm text-white/45">
                    {appointment.practiceArea.name} ·{" "}
                    {dateFormat.format(appointment.startAt)}
                  </p>
                </div>
                <StatusPill
                  tone={appointment.status === "CONFIRMED" ? "green" : "gold"}
                >
                  {appointment.status.replaceAll("_", " ")}
                </StatusPill>
              </div>
              {proposal ? (
                <div className="mt-5 rounded-xl bg-white/[0.04] p-4">
                  <p className="text-xs text-white/50">
                    Propuesta vigente: {dateFormat.format(proposal.startAt)} ·
                    vence{" "}
                    {proposal.hold
                      ? dateFormat.format(proposal.hold.expiresAt)
                      : "próximamente"}
                  </p>
                  {canRespondToAppointmentProposal(
                    actor,
                    proposal.proposerSide,
                  ) ? (
                    <ProposalActions
                      appointmentId={appointment.id}
                      proposalId={proposal.id}
                    />
                  ) : (
                    <p className="mt-3 text-xs text-white/35">
                      Esperando respuesta de la contraparte.
                    </p>
                  )}
                </div>
              ) : null}
              {appointment.status !== "CONFIRMED" &&
              !["CANCELLED", "DECLINED", "COMPLETED"].includes(
                appointment.status,
              ) ? (
                <ProposalForm
                  appointmentId={appointment.id}
                  durationMinutes={appointment.durationMinutes}
                />
              ) : null}
              {appointment.status === "CONFIRMED" ? (
                <a
                  className="mt-5 inline-flex text-[10px] uppercase tracking-[0.16em] text-[#d3d3d0]"
                  href={`/api/portal/citas/${appointment.id}/ics`}
                >
                  Descargar invitación ICS
                </a>
              ) : null}
            </article>
          );
        })}
        {!appointments.length ? (
          <p className="text-sm text-white/40">
            No hay citas asociadas a su perfil.
          </p>
        ) : null}
      </section>
    </div>
  );
}
