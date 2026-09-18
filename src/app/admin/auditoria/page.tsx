import { AdminHeading } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

export default async function AdminAuditPage() {
  const events = await db.auditLog.findMany({
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Trazabilidad"
        title="Auditoría"
        description="Registro funcional sanitizado. No muestra hashes, tokens, contraseñas, secretos ni contenido documental."
      />
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="hidden grid-cols-[1fr_1fr_0.8fr_1.1fr] gap-4 border-b border-black/10 px-6 py-4 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 md:grid">
          <span>Acción</span>
          <span>Entidad</span>
          <span>Actor</span>
          <span>Fecha</span>
        </div>
        <div className="divide-y divide-black/10">
          {events.map((event) => (
            <article
              key={event.id}
              className="grid gap-2 px-6 py-4 text-xs md:grid-cols-[1fr_1fr_0.8fr_1.1fr] md:gap-4"
            >
              <span className="font-semibold">{event.action}</span>
              <span className="text-black/45">
                {event.entityType} · {event.entityId.slice(0, 10)}…
              </span>
              <span className="text-black/45">
                {event.actor?.name || "Sistema"}
              </span>
              <time className="text-black/35">
                {event.createdAt.toLocaleString("es-MX")}
              </time>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
