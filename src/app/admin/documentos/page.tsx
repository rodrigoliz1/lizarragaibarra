import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
import { AdminHeading } from "@/components/admin/admin-primitives";
export default async function Documents({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const documents = await db.document.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { matter: { title: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { matter: { select: { id: true, title: true, reference: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <AdminHeading
        eyebrow="Expedientes"
        title="Documentos"
        description="Archivos privados vinculados a sus asuntos. Las descargas requieren autorización y análisis de seguridad."
      />
      <form className="admin-search">
        <input
          name="q"
          placeholder="Buscar documento o asunto"
          defaultValue={q}
          aria-label="Buscar documentos"
        />
        <button className="li-button">Buscar</button>
      </form>
      <div className="admin-rows">
        {documents.map((d) => (
          <div className="document-row" key={d.id}>
            <div>
              <h2>{d.title}</h2>
              <Link href={"/admin/asuntos/" + d.matterId}>
                {d.matter.reference} · {d.matter.title}
              </Link>
              <p>
                {d.visibility === "CLIENT" || d.visibility === "CLIENT_VISIBLE"
                  ? "Visible para el cliente"
                  : "Sólo equipo"}{" "}
                ·{" "}
                {d.scanStatus === "CLEAN"
                  ? "Verificado"
                  : d.scanStatus === "PENDING"
                    ? "Análisis pendiente"
                    : "Rechazado"}
              </p>
            </div>
            {d.scanStatus === "CLEAN" && (
              <a
                href={`/api/portal/asuntos/${d.matterId}/documentos/${d.id}`}
                className="li-button outline"
              >
                Descargar ↗
              </a>
            )}
          </div>
        ))}
      </div>
      {!documents.length && (
        <p className="admin-empty">
          Puede subir documentos desde la página de cada asunto.
        </p>
      )}
    </>
  );
}
