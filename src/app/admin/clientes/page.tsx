import type { Prisma } from "@prisma/client";
import { DatabaseZap, UsersRound } from "lucide-react";
import Link from "next/link";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const clientSelect = {
  id: true,
  phone: true,
  company: true,
  user: {
    select: {
      name: true,
      email: true,
      status: true,
    },
  },
  matters: {
    where: { status: "ACTIVE" },
    select: { id: true },
  },
  _count: { select: { matters: true } },
} satisfies Prisma.ClientProfileSelect;

type ClientRow = Prisma.ClientProfileGetPayload<{
  select: typeof clientSelect;
}>;

const statusPresentation = {
  INVITED: { label: "Invitado", tone: "blue" },
  ACTIVE: { label: "Activo", tone: "green" },
  SUSPENDED: { label: "Suspendido", tone: "gold" },
  ARCHIVED: { label: "Archivado", tone: "neutral" },
} as const;

async function loadClients(): Promise<
  | { kind: "ready"; clients: ClientRow[] }
  | { kind: "unavailable"; message: string }
> {
  if (!process.env.DATABASE_URL?.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL es obligatoria para consultar clientes.");
    }
    return {
      kind: "unavailable",
      message:
        "La base de datos no está configurada en este entorno. No se muestran datos simulados.",
    };
  }

  try {
    const clients = await db.clientProfile.findMany({
      select: clientSelect,
    });

    clients.sort((left, right) => {
      const leftName = left.company?.trim() || left.user.name;
      const rightName = right.company?.trim() || right.user.name;
      return leftName.localeCompare(rightName, "es-MX", {
        sensitivity: "base",
      });
    });

    return { kind: "ready", clients };
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error("No fue posible consultar los clientes.");
    }
    return {
      kind: "unavailable",
      message:
        "Existe una DATABASE_URL, pero no fue posible conectar o la migración aún no está aplicada.",
    };
  }
}

export default async function ClientsPage() {
  const result = await loadClients();

  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Relaciones"
        title="Clientes"
        description="Directorio de perfiles reales, su acceso y los asuntos que tienen asociados."
      />

      {result.kind === "unavailable" ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <DatabaseZap
            className="mx-auto size-8 text-black/35"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-serif text-2xl text-[#111]">
            Datos no disponibles
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            {result.message}
          </p>
        </section>
      ) : result.clients.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <UsersRound
            className="mx-auto size-8 text-black/35"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-serif text-2xl text-[#111]">
            Sin clientes registrados
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            Los perfiles de cliente aparecerán aquí cuando se incorporen a la
            plataforma. No se utilizan registros de demostración.
          </p>
        </section>
      ) : (
        <section
          aria-label="Directorio de clientes"
          className="overflow-hidden rounded-2xl border border-black/10 bg-white"
        >
          <div className="hidden grid-cols-[1.25fr_0.9fr_1.2fr_0.55fr_0.55fr] gap-4 border-b border-black/10 px-6 py-4 text-[9px] font-bold uppercase tracking-[0.16em] text-black/35 md:grid">
            <span>Cliente</span>
            <span>Contacto</span>
            <span>Correo</span>
            <span>Asuntos</span>
            <span>Acceso</span>
          </div>
          <div className="divide-y divide-black/10">
            {result.clients.map((client) => {
              const presentation = statusPresentation[client.user.status];
              const clientName = client.company?.trim() || client.user.name;

              return (
                <article
                  key={client.id}
                  className="grid gap-4 px-5 py-5 md:grid-cols-[1.25fr_0.9fr_1.2fr_0.55fr_0.55fr] md:items-center md:px-6"
                >
                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 md:hidden">
                      Cliente
                    </p>
                    <p className="truncate text-sm font-semibold">
                      {clientName}
                    </p>
                    {client.company ? (
                      <p className="mt-1 truncate text-xs text-black/40">
                        {client.user.name}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 md:hidden">
                      Contacto
                    </p>
                    <p className="truncate text-xs text-black/55">
                      {client.user.name}
                    </p>
                    {client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        className="mt-1 block truncate text-xs text-[#292929] hover:text-black"
                      >
                        {client.phone}
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-black/30">Sin teléfono</p>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 md:hidden">
                      Correo
                    </p>
                    <a
                      href={`mailto:${client.user.email}`}
                      className="block truncate text-xs text-[#292929] hover:text-black"
                    >
                      {client.user.email}
                    </a>
                  </div>

                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 md:hidden">
                      Asuntos
                    </p>
                    <p className="font-serif text-xl">
                      {client.matters.length}
                      <span className="ml-1 font-sans text-[10px] text-black/35">
                        activos
                      </span>
                    </p>
                    {client._count.matters !== client.matters.length ? (
                      <p className="mt-0.5 text-[10px] text-black/35">
                        {client._count.matters} en total
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-black/35 md:hidden">
                      Acceso
                    </p>
                    <AdminStatus tone={presentation.tone}>
                      {presentation.label}
                    </AdminStatus>
                    <Link
                      href={`/admin/clientes/${client.id}`}
                      className="mt-2 block text-[9px] font-bold uppercase tracking-[0.13em] text-black/45 hover:text-black"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
