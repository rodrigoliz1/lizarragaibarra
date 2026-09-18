import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
import { AdminHeading } from "@/components/admin/admin-primitives";
export default async function TeamAdmin() {
  await requireAdmin();
  const team = await db.lawyerProfile.findMany({
    include: { photo: true },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <>
      <AdminHeading
        eyebrow="La firma"
        title="Equipo y fotografías"
        description="Edite las semblanzas, datos de contacto y retratos que aparecen en el sitio."
        action={
          <Link href="/admin/abogados" className="li-button">
            Administrar integrantes ↗
          </Link>
        }
      />
      <div className="admin-team-grid">
        {team.map((l) => (
          <Link
            className="admin-team-person"
            href={"/admin/equipo/" + l.id}
            key={l.id}
          >
            <div className="admin-team-photo">
              {l.photoId || l.image ? (
                <Image
                  src={l.photoId ? "/api/portal/media/" + l.photoId : l.image!}
                  alt={l.displayName}
                  fill
                  unoptimized
                  sizes="180px"
                />
              ) : (
                <span>
                  {l.displayName
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")}
                </span>
              )}
            </div>
            <div>
              <span className="li-label">
                {l.position} · {l.active ? "Visible" : "Oculto"}
              </span>
              <h2>{l.displayName}</h2>
              <p>{l.emailPublic}</p>
              <p>{l.phone}</p>
              {!l.image && !l.photoId && (
                <small>Fotografía pendiente · PENDING_REAL_CONTENT</small>
              )}
              <span className="li-text-link">Editar perfil e imagen ↗</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
