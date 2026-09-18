import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
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

export const dynamic = "force-dynamic";

export default async function MattersPage() {
  const actor = await requireActor();
  const summary = await getPortalSummary(actor);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Expediente"
        title="Mis asuntos"
        description="Información visible para su cuenta, obtenida del repositorio privado y filtrada por autorización."
      />
      {summary.matters.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {summary.matters.map((matter) => (
            <article
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7"
              key={matter.id}
            >
              <div
                aria-hidden="true"
                className="absolute right-6 top-5 font-serif text-6xl text-white/[0.025]"
              >
                LI
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-paper-muted">
                  {matter.reference}
                </span>
                <StatusPill
                  tone={matter.status === "ACTIVE" ? "green" : "neutral"}
                >
                  {stageLabels[matter.stage] ?? matter.stage}
                </StatusPill>
              </div>
              <h2 className="mt-5 max-w-md font-serif text-3xl tracking-[-0.02em]">
                {matter.title}
              </h2>
              <div className="mt-8 border-y border-white/10 py-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-white/30">
                  Próxima actuación
                </p>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  {matter.nextActionPublic ??
                    "Sin actuación pública pendiente."}
                </p>
                {matter.nextActionAt ? (
                  <p className="mt-2 text-xs text-white/35">
                    {formatDate(matter.nextActionAt)}
                  </p>
                ) : null}
              </div>
              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-[10px] text-white/30">
                  <BriefcaseBusiness aria-hidden="true" className="size-3.5" />{" "}
                  Actualizado {formatDate(matter.updatedAt)}
                </span>
                <Link
                  className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-paper-muted hover:text-white"
                  href={`/portal/panel/asuntos/${matter.id}`}
                >
                  Abrir asunto{" "}
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          description="No hay asuntos visibles para esta cuenta. Si esperaba información, contacte a su equipo responsable."
          icon={BriefcaseBusiness}
          title="Sin asuntos asociados"
        />
      )}
    </div>
  );
}
