import {
  ArrowLeft,
  CalendarDays,
  Download,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { formatDate } from "@/lib/utils";
import { requireActor } from "@/server/policies";
import { getPortalMatter } from "@/server/services/portal-service";

export const dynamic = "force-dynamic";

export default async function PortalMatterPage({
  params,
}: {
  params: Promise<{ matterId: string }>;
}) {
  const { matterId } = await params;
  let matter: Awaited<ReturnType<typeof getPortalMatter>>;
  try {
    const actor = await requireActor();
    matter = await getPortalMatter(actor, matterId);
  } catch {
    notFound();
  }
  return (
    <div className="space-y-8">
      <Link
        className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45 hover:text-white"
        href="/portal/panel/asuntos"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" /> Mis asuntos
      </Link>
      <SectionHeading
        eyebrow={matter.reference}
        title={matter.title}
        description={
          matter.descriptionPublic ??
          "Resumen público pendiente de actualización."
        }
      />
      <div className="flex flex-wrap gap-3">
        <StatusPill tone="neutral">
          {matter.stage.replaceAll("_", " ")}
        </StatusPill>
        <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-white/40">
          Actualizado {formatDate(matter.updatedAt)}
        </span>
      </div>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <p className="eyebrow text-white/35">Actividad visible</p>
          <div className="mt-6 space-y-6">
            {matter.updates.length ? (
              matter.updates.map((update) => (
                <article
                  className="border-l border-white/15 pl-5"
                  key={update.id}
                >
                  <p className="text-xs text-white/35">
                    {formatDate(update.createdAt)}
                  </p>
                  <h2 className="mt-2 font-serif text-2xl">{update.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/55">
                    {update.body}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-white/40">
                Aún no existen actualizaciones públicas.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <p className="eyebrow text-white/35">Equipo asignado</p>
            <ul className="mt-5 space-y-3">
              {matter.assignments.map((assignment) => (
                <li
                  className="border-t border-white/10 pt-3 text-sm text-white/60"
                  key={`${assignment.lawyer.slug}-${assignment.role}`}
                >
                  {assignment.lawyer.displayName}
                  <span className="mt-1 block text-xs text-white/30">
                    {assignment.lawyer.position}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <p className="eyebrow text-white/35">Documentos compartidos</p>
            <ul className="mt-5 space-y-3">
              {matter.documents.length ? (
                matter.documents.map((document) => (
                  <li key={document.id}>
                    <a
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 p-4 text-sm text-white/60 hover:border-white/25 hover:text-white"
                      href={document.downloadUrl}
                    >
                      <span>{document.title}</span>
                      <Download
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                    </a>
                  </li>
                ))
              ) : (
                <li className="text-sm text-white/40">
                  No hay documentos visibles.
                </li>
              )}
            </ul>
          </section>
          <Link
            className="button-light w-full"
            href={`/portal/panel/mensajes?asunto=${matter.id}`}
          >
            <MessageSquareText aria-hidden="true" className="size-4" /> Mensajes
            de este asunto
          </Link>
          <Link
            className="button-outline w-full"
            href={`/agendar?origen=portal&asunto=${matter.id}`}
          >
            <CalendarDays aria-hidden="true" className="size-4" /> Agendar con
            mi abogado
          </Link>
        </div>
      </section>
    </div>
  );
}
