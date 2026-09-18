import { DocumentUploader } from "@/components/portal/document-uploader";
import { Download, FileText } from "lucide-react";
import { notFound } from "next/navigation";

import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { MatterChat } from "@/components/portal/matter-chat";
import { MatterUpdateComposer } from "@/components/portal/matter-update-composer";
import { requireActor } from "@/server/policies";
import { getPortalMatter } from "@/server/services/portal-service";

export default async function LawyerMatterDetail({
  params,
}: {
  params: Promise<{ matterId: string }>;
}) {
  const { matterId } = await params;
  const actor = await requireActor(["ADMIN"]);
  const matter = await getPortalMatter(actor, matterId).catch(() => null);
  if (!matter) notFound();
  return (
    <div className="space-y-8 bg-[#151713] text-white p-5 sm:p-8">
      <SectionHeading
        eyebrow={matter.reference}
        title={matter.title}
        description={matter.descriptionPublic || "Asunto asignado"}
      />
      <div className="flex gap-3">
        <StatusPill tone="green">{matter.status}</StatusPill>
        <StatusPill tone="neutral">
          {matter.stage.replaceAll("_", " ")}
        </StatusPill>
      </div>
      {matter.descriptionInternal ? (
        <section className="rounded-2xl border border-amber-200/15 bg-amber-100/[0.04] p-6">
          <p className="eyebrow text-amber-100/45">Información interna</p>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/55">
            {matter.descriptionInternal}
          </p>
        </section>
      ) : null}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <MatterUpdateComposer matterId={matterId} />
          <div className="rounded-2xl border border-white/10 p-6">
            <p className="eyebrow text-white/35">Avances</p>
            <div className="mt-5 space-y-5">
              {matter.updates.map((update) => (
                <article
                  key={update.id}
                  className="border-t border-white/10 pt-4"
                >
                  <h2 className="font-serif text-2xl">{update.title}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/50">
                    {update.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="eyebrow text-white/35">Conversación</p>
          <div className="mt-5">
            <MatterChat
              internalScope={
                actor.role === "ADMIN" || actor.lawyerRank === "PARTNER"
                  ? "partner"
                  : "staff"
              }
              matterId={matterId}
              currentUserId={actor.id}
              initialMessages={matter.messages}
            />
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 p-6">
        <p className="eyebrow text-white/35">Documentos</p>
        <DocumentUploader matterId={matterId} />
        <div className="mt-5 divide-y divide-white/10">
          {matter.documents.length ? (
            matter.documents.map((document) => {
              const status = {
                CLEAN: { label: "Disponible", tone: "green" as const },
                PENDING: { label: "En análisis", tone: "neutral" as const },
                REJECTED: { label: "Rechazado", tone: "gold" as const },
              }[document.scanStatus];
              const content = (
                <>
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white/70">
                      {document.title}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-white/30">
                      {document.originalName}
                    </span>
                  </span>
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  {document.scanStatus === "CLEAN" ? (
                    <Download aria-hidden="true" className="size-4" />
                  ) : null}
                </>
              );
              return document.scanStatus === "CLEAN" ? (
                <a
                  className="flex items-center gap-4 py-4 hover:text-white"
                  href={document.downloadUrl}
                  key={document.id}
                >
                  {content}
                </a>
              ) : (
                <div className="flex items-center gap-4 py-4" key={document.id}>
                  {content}
                </div>
              );
            })
          ) : (
            <p className="py-4 text-sm text-white/40">
              No hay documentos registrados en este asunto.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
