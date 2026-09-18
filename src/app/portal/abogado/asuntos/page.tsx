import Link from "next/link";

import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

import { createPartnerMatterAction } from "./actions";

export default async function LawyerMattersPage() {
  const actor = await requireActor(["LAWYER"]);
  const [matters, creationOptions] = await Promise.all([
    db.matter.findMany({
      where: { assignments: { some: { lawyerId: actor.lawyerProfileId! } } },
      include: {
        client: { select: { company: true, user: { select: { name: true } } } },
        assignments: {
          select: { role: true, lawyer: { select: { displayName: true } } },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    actor.lawyerRank === "PARTNER" && actor.lawyerProfileId
      ? Promise.all([
          db.clientProfile.findMany({
            where: {
              user: { status: { in: ["ACTIVE", "INVITED"] } },
              OR: [
                {
                  matters: {
                    some: {
                      assignments: {
                        some: { lawyerId: actor.lawyerProfileId },
                      },
                    },
                  },
                },
                {
                  user: {
                    actionTokens: {
                      some: { type: "ACCOUNT_INVITE", createdById: actor.id },
                    },
                  },
                },
              ],
            },
            select: {
              id: true,
              company: true,
              user: { select: { name: true } },
            },
            orderBy: { user: { name: "asc" } },
          }),
          db.lawyerProfile.findMany({
            where: {
              user: { status: "ACTIVE" },
              OR: [
                { id: actor.lawyerProfileId },
                { supervisorId: actor.lawyerProfileId },
              ],
            },
            select: { id: true, displayName: true },
            orderBy: { displayName: "asc" },
          }),
          db.practiceArea.findMany({
            where: { active: true },
            select: { id: true, name: true },
            orderBy: { sortOrder: "asc" },
          }),
        ])
      : null,
  ]);
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Expediente profesional"
        title="Mis asuntos"
        description="Sólo se muestran expedientes donde existe una asignación vigente para su perfil."
      />
      {creationOptions ? (
        <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <summary className="cursor-pointer font-serif text-2xl">
            Abrir un asunto
          </summary>
          <form
            action={createPartnerMatterAction}
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            <input
              name="reference"
              required
              placeholder="Referencia"
              className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
            />
            <input
              name="title"
              required
              placeholder="Título prudente"
              className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
            />
            <select
              name="clientId"
              required
              className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
            >
              <option value="">Cliente autorizado</option>
              {creationOptions[0].map((client) => (
                <option value={client.id} key={client.id}>
                  {client.company || client.user.name}
                </option>
              ))}
            </select>
            <select
              name="leadId"
              required
              className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
            >
              <option value="">Responsable</option>
              {creationOptions[1].map((lawyer) => (
                <option value={lawyer.id} key={lawyer.id}>
                  {lawyer.displayName}
                </option>
              ))}
            </select>
            <select
              name="practiceAreaId"
              className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
            >
              <option value="">Área de práctica</option>
              {creationOptions[2].map((area) => (
                <option value={area.id} key={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <select
              name="priority"
              defaultValue="NORMAL"
              className="h-11 rounded-lg border border-white/10 bg-black px-3 text-white"
            >
              <option value="LOW">Baja</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
            <textarea
              name="descriptionPublic"
              maxLength={5000}
              placeholder="Descripción visible para el cliente"
              className="min-h-28 rounded-lg border border-white/10 bg-black p-3 text-white sm:col-span-2"
            />
            <textarea
              name="descriptionInternal"
              maxLength={10000}
              placeholder="Contexto interno"
              className="min-h-28 rounded-lg border border-white/10 bg-black p-3 text-white sm:col-span-2"
            />
            <button className="h-11 rounded-full bg-white text-[9px] font-bold uppercase tracking-[0.14em] text-black sm:col-span-2">
              Crear asunto
            </button>
          </form>
        </details>
      ) : null}
      <section className="grid gap-4 lg:grid-cols-2">
        {matters.map((matter) => (
          <Link
            href={`/portal/abogado/asuntos/${matter.id}`}
            key={matter.id}
            className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 hover:border-white/25"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#d3d3d0]">
                {matter.reference}
              </p>
              <StatusPill
                tone={matter.status === "ACTIVE" ? "green" : "neutral"}
              >
                {matter.status}
              </StatusPill>
            </div>
            <h2 className="mt-6 font-serif text-3xl">{matter.title}</h2>
            <p className="mt-3 text-sm text-white/45">
              {matter.client.company || matter.client.user.name}
            </p>
            <p className="mt-6 text-xs text-white/30">
              {matter.stage.replaceAll("_", " ")} ·{" "}
              {matter.assignments
                .map((item) => item.lawyer.displayName)
                .join(", ")}
            </p>
          </Link>
        ))}
        {!matters.length ? (
          <p className="text-sm text-white/40">No hay asuntos asignados.</p>
        ) : null}
      </section>
    </div>
  );
}
