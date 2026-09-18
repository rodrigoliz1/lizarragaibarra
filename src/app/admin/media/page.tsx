import { AdminHeading } from "@/components/admin/admin-primitives";
import { MediaLibrary } from "@/components/admin/media-library";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
import { mediaUsage } from "@/server/services/media-service";
export default async function Media() {
  await requireAdmin();
  const media = await db.mediaAsset.findMany({
    where: { status: "READY", type: { not: "DOCUMENT" } },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
  const items = await Promise.all(
    media.map(async (i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      usage: await mediaUsage(i.id),
    })),
  );
  return (
    <>
      <AdminHeading
        eyebrow="Contenido"
        title="Biblioteca multimedia"
        description="Imágenes editoriales y fotografías del equipo. Los documentos de clientes se gestionan dentro de cada asunto."
      />
      <MediaLibrary items={items} />
    </>
  );
}
