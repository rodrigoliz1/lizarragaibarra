import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BriefcaseBusiness, DatabaseZap } from "lucide-react";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";
import { createMatterAction } from "./actions";

export const dynamic = "force-dynamic";

const matterSelect = {
  id: true,
  reference: true,
  title: true,
  status: true,
  stage: true,
  nextActionAt: true,
  nextActionPublic: true,
  client: {
    select: {
      company: true,
      user: { select: { name: true } },
    },
  },
  assignments: {
    orderBy: { assignedAt: "asc" },
    select: {
      role: true,
      lawyer: { select: { displayName: true } },
    },
  },
} satisfies Prisma.MatterSelect;

type MatterRow = Prisma.MatterGetPayload<{
  select: typeof matterSelect;
}>;

const matterStatusPresentation = {
  ACTIVE: { label: "Activo", tone: "green" },
  CONCLUDED: { label: "Concluido", tone: "blue" },
  ARCHIVED: { label: "Archivado", tone: "neutral" },
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

const rolePriority = {
  LEAD: 0,
  LEAD_LAWYER: 0,
  COLLABORATOR: 1,
  REVIEWER: 2,
  SUPERVISING_PARTNER: 3,
} as const;

async function loadMatters(): Promise<
  | { kind: "ready"; matters: MatterRow[] }
  | { kind: "unavailable"; message: string }
> {
  if (!process.env.DATABASE_URL?.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL es obligatoria para consultar asuntos.");
    }
    return {
      kind: "unavailable",
      message:
        "La base de datos no está configurada en este entorno. No se muestran datos simulados.",
    };
  }

  try {
    const matters = await db.matter.findMany({
      select: matterSelect,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
    return { kind: "ready", matters };
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error("No fue posible consultar los asuntos.");
    }
    return {
      kind: "unavailable",
      message:
        "Existe una DATABASE_URL, pero no fue posible conectar o la migración aún no está aplicada.",
    };
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function AdminMattersPage() {
  const result = await loadMatters();
  const creationOptions =
    result.kind === "ready"
      ? await Promise.all([
          db.clientProfile.findMany({
            where: { user: { status: { in: ["ACTIVE", "INVITED"] } } },
            select: {
              id: true,
              company: true,
              user: { select: { name: true } },
            },
            orderBy: { user: { name: "asc" } },
          }),
          db.lawyerProfile.findMany({
            where: { active: true },
            select: { id: true, displayName: true, rank: true },
            orderBy: [{ rank: "asc" }, { displayName: "asc" }],
          }),
          db.practiceArea.findMany({
            where: { active: true },
            select: { id: true, name: true },
            orderBy: { sortOrder: "asc" },
          }),
        ])
      : null;

  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Expedientes"
        title="Asuntos"
        description="Control de asuntos reales, responsables, etapa procesal y próximos hitos."
      />

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
      ) : result.matters.length === 0 && !creationOptions ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <BriefcaseBusiness
            className="mx-auto size-8 text-black/35"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-serif text-2xl text-[#111]">
            Sin asuntos registrados
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            Los expedientes aparecerán aquí cuando se registren en la
            plataforma. No se utilizan asuntos de demostración.
          </p>
        </section>
      ) : (
        <>
          {creationOptions ? (
            <details className="rounded-2xl border border-black/10 bg-white p-6">
              <summary className="cursor-pointer font-serif text-2xl">
                Crear asunto
              </summary>
              <form
                action={createMatterAction}
                className="mt-6 grid gap-4 md:grid-cols-2"
              >
                <input
                  name="reference"
                  required
                  placeholder="Referencia"
                  className="h-11 rounded-lg border border-black/10 px-3"
                />
                <input
                  name="title"
                  required
                  placeholder="Título prudente"
                  className="h-11 rounded-lg border border-black/10 px-3"
                />
                <select
                  name="clientId"
                  required
                  className="h-11 rounded-lg border border-black/10 px-3"
                >
                  <option value="">Cliente</option>
                  {creationOptions[0].map((client) => (
                    <option value={client.id} key={client.id}>
                      {client.company || client.user.name}
                    </option>
                  ))}
                </select>
                <select
                  name="practiceAreaId"
                  className="h-11 rounded-lg border border-black/10 px-3"
                >
                  <option value="">Área de práctica</option>
                  {creationOptions[2].map((area) => (
                    <option value={area.id} key={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
                <select
                  name="leadId"
                  required
                  className="h-11 rounded-lg border border-black/10 px-3"
                >
                  <option value="">Abogado responsable</option>
                  {creationOptions[1].map((lawyer) => (
                    <option value={lawyer.id} key={lawyer.id}>
                      {lawyer.displayName}
                    </option>
                  ))}
                </select>
                <select
                  name="supervisorId"
                  className="h-11 rounded-lg border border-black/10 px-3"
                >
                  <option value="">Socio supervisor opcional</option>
                  {creationOptions[1]
                    .filter((lawyer) => lawyer.rank === "PARTNER")
                    .map((lawyer) => (
                      <option value={lawyer.id} key={lawyer.id}>
                        {lawyer.displayName}
                      </option>
                    ))}
                </select>
                <select
                  name="priority"
                  className="h-11 rounded-lg border border-black/10 px-3"
                >
                  <option value="NORMAL">Prioridad normal</option>
                  <option value="LOW">Baja</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
                <span />
                <textarea
                  name="descriptionPublic"
                  placeholder="Descripción visible para el cliente"
                  className="min-h-24 rounded-lg border border-black/10 p-3"
                />
                <textarea
                  name="descriptionInternal"
                  placeholder="Descripción interna"
                  className="min-h-24 rounded-lg border border-black/10 p-3"
                />
                <button className="h-11 rounded-full bg-black text-[9px] font-bold uppercase tracking-[0.14em] text-white md:col-span-2">
                  Crear asunto y asignar
                </button>
              </form>
            </details>
          ) : null}
          <section
            aria-label="Asuntos registrados"
            className="overflow-hidden rounded-2xl border border-black/10 bg-white"
          >
            <div className="hidden grid-cols-[0.7fr_1fr_1.2fr_0.95fr_0.9fr_0.85fr] gap-4 border-b border-black/10 px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-black/35 lg:grid">
              <span>Referencia</span>
              <span>Cliente</span>
              <span>Asunto</span>
              <span>Responsables</span>
              <span>Etapa / estado</span>
              <span>Próximo hito</span>
            </div>
            <div className="divide-y divide-black/10">
              {result.matters.map((matter) => {
                const presentation = matterStatusPresentation[matter.status];
                const clientName =
                  matter.client.company?.trim() || matter.client.user.name;
                const owners = [...matter.assignments]
                  .sort(
                    (left, right) =>
                      rolePriority[left.role] - rolePriority[right.role],
                  )
                  .map((assignment) => assignment.lawyer.displayName)
                  .join(", ");

                return (
                  <article
                    key={matter.id}
                    className="grid gap-4 px-5 py-5 lg:grid-cols-[0.7fr_1fr_1.2fr_0.95fr_0.9fr_0.85fr] lg:items-center lg:px-6"
                  >
                    <div>
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 lg:hidden">
                        Referencia
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#8b8b87]">
                        {matter.reference}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 lg:hidden">
                        Cliente
                      </p>
                      <p className="truncate text-xs font-semibold">
                        {clientName}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 lg:hidden">
                        Asunto
                      </p>
                      <p className="text-xs leading-5 text-black/55">
                        <Link
                          href={`/admin/asuntos/${matter.id}`}
                          className="underline underline-offset-4"
                        >
                          {matter.title}
                        </Link>
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 lg:hidden">
                        Responsables
                      </p>
                      <p className="text-xs leading-5 text-black/55">
                        {owners || "Sin responsable"}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 lg:hidden">
                        Etapa / estado
                      </p>
                      <p className="mb-2 text-[10px] text-black/45">
                        {matterStageLabels[matter.stage]}
                      </p>
                      <AdminStatus tone={presentation.tone}>
                        {presentation.label}
                      </AdminStatus>
                    </div>

                    <div>
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 lg:hidden">
                        Próximo hito
                      </p>
                      <p className="font-serif text-lg">
                        {matter.nextActionAt
                          ? formatDate(matter.nextActionAt)
                          : "Sin fecha"}
                      </p>
                      {matter.nextActionPublic ? (
                        <p className="mt-1 text-[10px] leading-4 text-black/40">
                          {matter.nextActionPublic}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
