import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
const labels = {
  DRAFT: "Borrador",
  PENDING_REVIEW: "En revisión",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};
export default async function Cases() {
  await requireAdmin();
  const cases = await db.caseStudy.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return (
    <>
      <AdminHeading
        eyebrow="Experiencia"
        title="Casos de éxito"
        description="Casos reales revisados para proteger la confidencialidad del cliente."
        action={
          <Link href="/admin/casos/nuevo" className="li-button">
            Nuevo caso ↗
          </Link>
        }
      />
      <div className="admin-rows">
        {cases.map((c) => (
          <Link href={"/admin/casos/" + c.id} key={c.id}>
            <div>
              <h2>{c.title}</h2>
              <p>{c.practiceArea}</p>
            </div>
            <span>{labels[c.status]}</span>
          </Link>
        ))}
      </div>
      {!cases.length && (
        <p className="admin-empty">
          Cree el primer caso documentado. Sólo se mostrará en el sitio después
          de publicarlo y confirmar su revisión de confidencialidad.
        </p>
      )}
    </>
  );
}
