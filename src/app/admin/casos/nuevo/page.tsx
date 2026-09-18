import { CaseEditor } from "@/components/admin/case-editor";
import { AdminHeading } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
export default async function NewCase({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const media = await db.mediaAsset.findMany({
    where: { status: "READY", mimeType: { startsWith: "image/" } },
    select: { id: true, altText: true },
    take: 200,
  });
  const params = await searchParams;
  return (
    <>
      <AdminHeading eyebrow="Casos de éxito" title="Documentar un caso" />
      {params.error && (
        <p className="form-status error" role="alert">
          Revise los campos y la confirmación de confidencialidad. El caso no se
          guardó.
        </p>
      )}
      <CaseEditor media={media} />
    </>
  );
}
