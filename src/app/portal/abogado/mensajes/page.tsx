import Link from "next/link";

import { SectionHeading } from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

export default async function LawyerMessagesPage() {
  const actor = await requireActor(["LAWYER"]);
  const matters = await db.matter.findMany({
    where: {
      assignments: { some: { lawyerId: actor.lawyerProfileId! } },
      messages: { some: {} },
    },
    select: {
      id: true,
      reference: true,
      title: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          createdAt: true,
          sender: { select: { name: true } },
        },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Comunicaciones"
        title="Mensajes"
        description="Conversaciones persistentes dentro de asuntos donde su perfil está asignado."
      />
      <section className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {matters.map((matter) => (
          <Link
            href={`/portal/abogado/asuntos/${matter.id}`}
            key={matter.id}
            className="block p-6 hover:bg-white/[0.025]"
          >
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#d3d3d0]">
                  {matter.reference}
                </p>
                <h2 className="mt-2 font-serif text-2xl">{matter.title}</h2>
              </div>
              <span className="text-xs text-white/30">
                {matter._count.messages}
              </span>
            </div>
            {matter.messages[0] ? (
              <p className="mt-4 line-clamp-2 text-sm text-white/40">
                {matter.messages[0].sender.name}: {matter.messages[0].body}
              </p>
            ) : null}
          </Link>
        ))}
        {!matters.length ? (
          <p className="p-8 text-sm text-white/40">
            No hay conversaciones registradas.
          </p>
        ) : null}
      </section>
    </div>
  );
}
