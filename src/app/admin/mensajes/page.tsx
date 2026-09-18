import Link from "next/link";

import { AdminHeading } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

export default async function AdminMessagesPage() {
  const threads = await db.matter.findMany({
    where: { messages: { some: {} } },
    select: {
      id: true,
      reference: true,
      title: true,
      client: { select: { user: { select: { name: true } } } },
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          visibility: true,
          createdAt: true,
          sender: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Consulta funcional autorizada"
        title="Mensajes"
        description="Conversaciones por asunto. El contenido se mantiene dentro de la plataforma y no se replica en analítica."
      />
      <section className="divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 bg-white">
        {threads.map((thread) => (
          <Link
            href={`/admin/asuntos?asunto=${thread.id}`}
            key={thread.id}
            className="block p-6 hover:bg-black/[0.015]"
          >
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-black/35">
                  {thread.reference} · {thread.client.user.name}
                </p>
                <h2 className="mt-2 font-serif text-2xl">{thread.title}</h2>
              </div>
              <span className="text-xs text-black/30">
                {thread._count.messages}
              </span>
            </div>
            {thread.messages[0] ? (
              <p className="mt-4 line-clamp-2 text-sm text-black/45">
                {thread.messages[0].sender.name}: {thread.messages[0].body}
              </p>
            ) : null}
          </Link>
        ))}
      </section>
    </div>
  );
}
