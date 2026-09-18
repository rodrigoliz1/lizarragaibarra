import { MessageSquareText } from "lucide-react";

import { MatterChat } from "@/components/portal/matter-chat";
import { SectionHeading } from "@/components/portal/portal-primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActor } from "@/server/policies";
import {
  getPortalMatter,
  getPortalSummary,
} from "@/server/services/portal-service";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const actor = await requireActor();
  const summary = await getPortalSummary(actor);
  const requestedMatterId =
    typeof params.asunto === "string" ? params.asunto : undefined;
  const matterId = summary.matters.some(
    (matter) => matter.id === requestedMatterId,
  )
    ? requestedMatterId
    : summary.matters[0]?.id;
  if (!matterId)
    return (
      <EmptyState
        description="No existe un asunto asociado en el cual registrar mensajes."
        icon={MessageSquareText}
        title="Sin canal disponible"
      />
    );
  const matter = await getPortalMatter(actor, matterId);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={matter.reference}
        title="Mensajes"
        description={`Conversación visible relacionada con ${matter.title}.`}
      />
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
        <div className="flex items-center gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
          <span className="grid size-10 place-items-center rounded-full border border-white/10 text-paper-muted">
            <MessageSquareText aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h2 className="font-serif text-2xl">Equipo LI · {matter.title}</h2>
            <p className="mt-1 text-[10px] text-white/30">
              Canal privado del asunto
            </p>
          </div>
        </div>
        <MatterChat
          matterId={matter.id}
          currentUserId={actor.id}
          initialMessages={matter.messages}
        />
      </section>
    </div>
  );
}
