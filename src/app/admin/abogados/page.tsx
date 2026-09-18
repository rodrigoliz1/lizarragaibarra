import Link from "next/link";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

export default async function AdminLawyersPage() {
  const lawyers = await db.lawyerProfile.findMany({
    include: {
      user: { select: { email: true, status: true } },
      areas: { include: { practiceArea: { select: { name: true } } } },
      supervisor: { select: { displayName: true } },
      _count: { select: { assignments: true, appointments: true } },
    },
    orderBy: [{ rank: "asc" }, { sortOrder: "asc" }],
  });
  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Estructura profesional"
        title="Abogados y socios"
        description="Rango profesional separado del rol técnico, áreas, supervisión y carga funcional."
        action={
          <Link
            href="/admin/usuarios"
            className="rounded-full bg-black px-5 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-white"
          >
            Invitar profesional
          </Link>
        }
      />
      <section className="grid gap-4 lg:grid-cols-3">
        {lawyers.map((lawyer) => (
          <Link
            href={`/admin/abogados/${lawyer.id}`}
            className="rounded-2xl border border-black/10 bg-white p-6"
            key={lawyer.id}
          >
            <div className="flex justify-between gap-4">
              <AdminStatus
                tone={lawyer.rank === "PARTNER" ? "blue" : "neutral"}
              >
                {lawyer.rank}
              </AdminStatus>
              <AdminStatus
                tone={lawyer.user?.status === "ACTIVE" ? "green" : "gold"}
              >
                {lawyer.user?.status || "SIN CUENTA"}
              </AdminStatus>
            </div>
            <h2 className="mt-6 font-serif text-3xl">{lawyer.displayName}</h2>
            <p className="mt-2 text-sm text-black/45">{lawyer.position}</p>
            <p className="mt-5 text-xs leading-5 text-black/40">
              {lawyer.areas.map((area) => area.practiceArea.name).join(", ") ||
                "Sin áreas"}
            </p>
            <p className="mt-5 border-t border-black/10 pt-4 text-[10px] text-black/35">
              {lawyer._count.assignments} asuntos · {lawyer._count.appointments}{" "}
              citas
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
