import { notFound } from "next/navigation";
import Link from "next/link";
import { CaseEditor } from "@/components/admin/case-editor";
import { AdminHeading } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
export default async function EditCase({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; guardado?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;
  const [initial, media] = await Promise.all([
    db.caseStudy.findUnique({ where: { id } }),
    db.mediaAsset.findMany({
      where: { status: "READY", mimeType: { startsWith: "image/" } },
      select: { id: true, altText: true },
      take: 200,
    }),
  ]);
  if (!initial) notFound();
  return (
    <>
      <AdminHeading
        eyebrow="Casos de éxito"
        title={initial.title}
        action={
          <Link
            className="li-button outline"
            href={"/admin/casos/" + id + "/preview"}
          >
            Vista previa ↗
          </Link>
        }
      />
      {flags.error && (
        <p role="alert" className="form-status error">
          No se guardaron los cambios. Revise la URL, los campos y la
          confirmación de confidencialidad.
        </p>
      )}
      {flags.guardado && (
        <p role="status" className="form-status">
          Cambios guardados.
        </p>
      )}
      <CaseEditor initial={initial} media={media} />
    </>
  );
}
