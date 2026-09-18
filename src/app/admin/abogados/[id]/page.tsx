import { notFound } from "next/navigation";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";
import { updateLawyerContactAction } from "./actions";

export default async function AdminLawyerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lawyer = await db.lawyerProfile.findUnique({
    where: { id },
    include: {
      user: true,
      areas: { include: { practiceArea: true } },
      supervisor: true,
      supervisedLawyers: { select: { id: true, displayName: true } },
      assignments: {
        include: {
          matter: {
            select: { id: true, reference: true, title: true, status: true },
          },
        },
        take: 30,
      },
    },
  });
  if (!lawyer) notFound();
  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow={lawyer.rank}
        title={lawyer.displayName}
        description={lawyer.position}
      />
      <div className="flex gap-3">
        <AdminStatus tone={lawyer.active ? "green" : "neutral"}>
          {lawyer.active ? "Perfil público" : "Perfil privado"}
        </AdminStatus>
        <AdminStatus tone={lawyer.user?.status === "ACTIVE" ? "green" : "gold"}>
          {lawyer.user?.status || "Sin cuenta"}
        </AdminStatus>
      </div>
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Perfil</h2>
          <dl className="mt-6 space-y-5 text-sm">
            <div>
              <dt className="text-[9px] uppercase tracking-[0.14em] text-black/35">
                Correo
              </dt>
              <dd className="mt-1">
                {lawyer.user?.email || lawyer.emailPublic || "No registrado"}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-[0.14em] text-black/35">
                Áreas
              </dt>
              <dd className="mt-1">
                {lawyer.areas
                  .map((area) => area.practiceArea.name)
                  .join(", ") || "Sin áreas"}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-[0.14em] text-black/35">
                Supervisor
              </dt>
              <dd className="mt-1">
                {lawyer.supervisor?.displayName || "No asignado"}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-[0.14em] text-black/35">
                Biografía
              </dt>
              <dd className="mt-1 whitespace-pre-wrap leading-7 text-black/55">
                {lawyer.bio}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-serif text-3xl">Asuntos asignados</h2>
          <ul className="mt-6 divide-y divide-black/10">
            {lawyer.assignments.map((assignment) => (
              <li key={assignment.matterId} className="py-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-black/35">
                  {assignment.matter.reference} · {assignment.role}
                </p>
                <p className="mt-1 text-sm">{assignment.matter.title}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="font-serif text-3xl">Contacto público</h2>
        <p className="mt-2 text-xs leading-5 text-black/45">
          Estos datos aparecen en el perfil público del integrante. Si quedan
          vacíos, se utilizan los datos generales del despacho.
        </p>
        <form
          action={updateLawyerContactAction}
          className="mt-6 grid gap-4 md:grid-cols-3"
        >
          <input type="hidden" name="id" value={lawyer.id} />
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/45">
            Correo
            <input
              type="email"
              name="emailPublic"
              defaultValue={lawyer.emailPublic || ""}
              className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3 text-sm normal-case tracking-normal text-black"
            />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/45">
            Celular
            <input
              name="phone"
              defaultValue={lawyer.phone || ""}
              className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3 text-sm normal-case tracking-normal text-black"
            />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/45">
            LinkedIn
            <input
              type="url"
              name="linkedInUrl"
              defaultValue={lawyer.linkedInUrl || ""}
              placeholder="https://www.linkedin.com/in/..."
              className="mt-2 h-11 w-full rounded-lg border border-black/10 px-3 text-sm normal-case tracking-normal text-black"
            />
          </label>
          <button className="h-11 rounded-full bg-black px-5 text-[9px] font-bold uppercase tracking-[0.14em] text-white md:col-span-3">
            Guardar contacto
          </button>
        </form>
      </section>
    </div>
  );
}
