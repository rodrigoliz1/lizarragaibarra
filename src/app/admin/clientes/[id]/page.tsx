import { notFound } from "next/navigation";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

export default async function AdminClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await db.clientProfile.findUnique({
    where: { id },
    include: {
      user: true,
      matters: {
        include: {
          assignments: {
            include: { lawyer: { select: { displayName: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      appointments: {
        include: { lawyer: { select: { displayName: true } } },
        orderBy: { startAt: "desc" },
        take: 30,
      },
    },
  });
  if (!client) notFound();
  const audit = await db.auditLog.findMany({
    where: { OR: [{ entityId: client.userId }, { entityId: client.id }] },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Cuenta de cliente"
        title={client.user.name}
        description={client.company || "Cliente individual"}
      />
      <div className="flex gap-3">
        <AdminStatus tone={client.user.status === "ACTIVE" ? "green" : "gold"}>
          {client.user.status}
        </AdminStatus>
        <span className="rounded-full border border-black/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-black/40">
          Último acceso{" "}
          {client.user.lastLoginAt?.toLocaleString("es-MX") || "sin acceso"}
        </span>
      </div>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Perfil</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-black/35">Correo</dt>
              <dd>{client.user.email}</dd>
            </div>
            <div>
              <dt className="text-black/35">Teléfono</dt>
              <dd>{client.phone || "No registrado"}</dd>
            </div>
            <div>
              <dt className="text-black/35">Notas internas</dt>
              <dd className="whitespace-pre-wrap text-black/55">
                {client.notesInternal || "Sin notas"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Asuntos</h2>
          <ul className="mt-5 divide-y divide-black/10">
            {client.matters.map((matter) => (
              <li className="py-4" key={matter.id}>
                <p className="text-[9px] uppercase tracking-[0.14em] text-black/35">
                  {matter.reference} · {matter.status}
                </p>
                <p className="mt-1 text-sm">{matter.title}</p>
                <p className="mt-1 text-xs text-black/35">
                  {matter.assignments
                    .map((item) => item.lawyer.displayName)
                    .join(", ") || "Sin responsables"}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Citas</h2>
          <ul className="mt-5 divide-y divide-black/10">
            {client.appointments.map((appointment) => (
              <li className="py-4 text-sm" key={appointment.id}>
                {appointment.reference} · {appointment.status}
                <span className="block text-xs text-black/35">
                  {appointment.startAt.toLocaleString("es-MX")} ·{" "}
                  {appointment.lawyer?.displayName || "Sin asignar"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Actividad</h2>
          <ul className="mt-5 divide-y divide-black/10">
            {audit.map((event) => (
              <li className="py-3 text-xs" key={event.id}>
                {event.action}
                <span className="block text-black/35">
                  {event.createdAt.toLocaleString("es-MX")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
