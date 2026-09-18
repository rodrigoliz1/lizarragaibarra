import { Download, FileText } from "lucide-react";

import { SectionHeading } from "@/components/portal/portal-primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { requireActor } from "@/server/policies";
import {
  getPortalMatter,
  getPortalSummary,
} from "@/server/services/portal-service";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const actor = await requireActor();
  const summary = await getPortalSummary(actor);
  const matters = await Promise.all(
    summary.matters.map((matter) => getPortalMatter(actor, matter.id)),
  );
  const documents = matters.flatMap((matter) =>
    matter.documents.map((document) => ({
      ...document,
      matterReference: matter.reference,
    })),
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Repositorio"
        title="Documentos"
        description="Archivos que el equipo marcó expresamente como visibles para su cuenta."
      />
      {documents.length ? (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          <div className="hidden grid-cols-[1.6fr_0.65fr_0.65fr_0.3fr] gap-4 border-b border-white/10 px-6 py-4 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/30 md:grid">
            <span>Archivo</span>
            <span>Asunto</span>
            <span>Publicado</span>
            <span>Acceso</span>
          </div>
          <div className="divide-y divide-white/10">
            {documents.map((document) => (
              <article
                className="grid gap-4 px-5 py-5 md:grid-cols-[1.6fr_0.65fr_0.65fr_0.3fr] md:items-center md:px-6"
                key={document.id}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20 text-paper-muted">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white/80">
                      {document.title}
                    </p>
                    <p className="mt-1 text-[10px] text-white/30">
                      {document.originalName} ·{" "}
                      {Math.max(1, Math.round(document.size / 1024))} KB
                    </p>
                  </div>
                </div>
                <p className="text-xs text-white/40">
                  {document.matterReference}
                </p>
                <p className="text-xs text-white/40">
                  {formatDate(document.createdAt)}
                </p>
                <a
                  aria-label={`Descargar ${document.title}`}
                  className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-paper-muted hover:text-white"
                  href={document.downloadUrl}
                >
                  Descargar <Download aria-hidden="true" className="size-3.5" />
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          description="El equipo aún no ha compartido documentos visibles con esta cuenta."
          icon={FileText}
          title="Sin documentos compartidos"
        />
      )}
    </div>
  );
}
