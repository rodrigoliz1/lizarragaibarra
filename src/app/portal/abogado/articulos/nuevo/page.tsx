import { ArticleEditor } from "@/components/articles/article-editor";
import { SectionHeading } from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

export default async function NewArticlePage() {
  const actor = await requireActor(["LAWYER"]);
  const [practiceAreas, authors] = await Promise.all([
    db.practiceArea.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.user.findMany({
      where: { role: "LAWYER", status: "ACTIVE", id: { not: actor.id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Editor guiado"
        title="Nuevo artículo"
        description="Construya el contenido por bloques; no se admite HTML libre ni scripts."
      />
      <ArticleEditor practiceAreas={practiceAreas} authors={authors} />
    </div>
  );
}
