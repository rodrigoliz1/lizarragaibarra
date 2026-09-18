import { CheckCircle2, Clock3 } from "lucide-react";

import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { requireActor } from "@/server/policies";
import {
  getPortalMatter,
  getPortalSummary,
} from "@/server/services/portal-service";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const actor = await requireActor();
  const summary = await getPortalSummary(actor);
  const matters = await Promise.all(
    summary.matters.map((matter) => getPortalMatter(actor, matter.id)),
  );
  const activity = matters
    .flatMap((matter) =>
      matter.updates.map((update) => ({ ...update, matter: matter.reference })),
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Trazabilidad"
        title="Cronología"
        description="Actualizaciones que el equipo marcó como visibles para su cuenta."
      />
      {activity.length ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-8">
          <ol className="relative ml-2 border-l border-white/10 sm:ml-8">
            {activity.map((event, index) => (
              <li
                className="relative pb-10 pl-7 last:pb-0 sm:pl-10"
                key={event.id}
              >
                <span className="absolute -left-[17px] top-0 grid size-8 place-items-center rounded-full border border-paper-muted/35 bg-ink-3 text-paper-muted">
                  {index === 0 ? (
                    <Clock3 aria-hidden="true" className="size-3.5" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  )}
                </span>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-paper-muted">
                        {formatDate(event.createdAt)}
                      </p>
                      <StatusPill>Actualización</StatusPill>
                    </div>
                    <h2 className="mt-3 font-serif text-2xl">{event.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                      {event.body}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/30">
                    {event.matter}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <EmptyState
          description="Aún no hay actualizaciones visibles en los asuntos asociados."
          icon={Clock3}
          title="Sin actividad reciente"
        />
      )}
    </div>
  );
}
