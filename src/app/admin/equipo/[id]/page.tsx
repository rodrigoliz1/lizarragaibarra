import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
import { AdminHeading } from "@/components/admin/admin-primitives";
import { SubmitButton } from "@/components/public/submit-button";
import { saveProfile } from "../actions";
export default async function Profile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; guardado?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;
  const [l, media, areas] = await Promise.all([
    db.lawyerProfile.findUnique({ where: { id }, include: { areas: true } }),
    db.mediaAsset.findMany({
      where: { status: "READY", mimeType: { startsWith: "image/" } },
      select: { id: true, altText: true },
      take: 250,
    }),
    db.practiceArea.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  if (!l) notFound();
  return (
    <>
      <AdminHeading
        eyebrow="Equipo"
        title={l.displayName}
        action={
          <Link href={"/equipo/" + l.slug} className="li-button outline">
            Ver perfil público ↗
          </Link>
        }
      />
      {flags.error && (
        <p className="form-status error" role="alert">
          No se pudo guardar. Revise los datos y la fotografía seleccionada.
        </p>
      )}
      {flags.guardado && (
        <p className="form-status" role="status">
          Perfil actualizado.
        </p>
      )}
      <form action={saveProfile} className="li-form admin-editor">
        <input name="id" hidden defaultValue={id} />
        <div className="field-pair">
          <label>
            Nombre completo
            <input name="displayName" required defaultValue={l.displayName} />
          </label>
          <label>
            Cargo
            <input name="position" required defaultValue={l.position} />
          </label>
        </div>
        <label>
          Fotografía
          <select name="photoId" defaultValue={l.photoId || ""}>
            <option value="">
              {l.image ? "Fotografía original" : "Sin fotografía"}
            </option>
            {media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.altText}
              </option>
            ))}
          </select>
        </label>
        <Link href="/admin/media" className="li-text-link">
          Cargar una nueva fotografía en la biblioteca ↗
        </Link>
        <label>
          Semblanza (un párrafo por línea)
          <textarea name="bio" required rows={8} defaultValue={l.bio} />
        </label>
        <label>
          Formación
          <input name="education" required defaultValue={l.education} />
        </label>
        <div className="field-pair">
          <label>
            Correo público
            <input
              name="emailPublic"
              type="email"
              required
              defaultValue={l.emailPublic || ""}
            />
          </label>
          <label>
            Celular y WhatsApp (10 dígitos)
            <input
              name="phone"
              type="tel"
              required
              pattern="[0-9]{10}"
              defaultValue={l.phone || ""}
            />
          </label>
        </div>
        <fieldset>
          <legend>Áreas de práctica</legend>
          {areas.map((a) => (
            <label className="check" key={a.id}>
              <input
                type="checkbox"
                name="areaIds"
                value={a.id}
                defaultChecked={l.areas.some((x) => x.practiceAreaId === a.id)}
              />
              {a.name}
            </label>
          ))}
        </fieldset>
        <label>
          Orden de aparición
          <input
            name="sortOrder"
            type="number"
            min={0}
            max={999}
            defaultValue={l.sortOrder}
          />
        </label>
        <label className="check">
          <input name="active" type="checkbox" defaultChecked={l.active} />
          Mostrar en el sitio
        </label>
        <label className="check">
          <input name="featured" type="checkbox" defaultChecked={l.featured} />
          Destacar perfil
        </label>
        <SubmitButton>Guardar perfil</SubmitButton>
      </form>
    </>
  );
}
