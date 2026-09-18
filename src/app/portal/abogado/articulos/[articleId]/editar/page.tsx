import { notFound } from "next/navigation";

import { ArticleEditor } from "@/components/articles/article-editor";
import { SectionHeading } from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const [{ articleId }, actor] = await Promise.all([
    params,
    requireActor(["LAWYER"]),
  ]);
  const [article, practiceAreas, authors] = await Promise.all([
    db.article.findFirst({
      where: {
        id: articleId,
        authorId: actor.id,
        status: {
          in: [
            "DRAFT",
            "CHANGES_REQUESTED",
            "REJECTED",
            "PUBLISHED",
            "ARCHIVED",
          ],
        },
      },
      include: {
        blocks: { orderBy: { sortOrder: "asc" } },
        coauthors: { orderBy: { sortOrder: "asc" } },
      },
    }),
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
  if (!article) notFound();
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Edición guiada"
        title={article.title}
        description="Los cambios se guardan como bloques estructurados y quedan auditados."
      />
      <ArticleEditor
        practiceAreas={practiceAreas}
        authors={authors}
        initial={{
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          introduction: article.introduction,
          practiceAreaId: article.practiceAreaId,
          heroMediaId: article.heroMediaId,
          coauthorIds: article.coauthors.map((item) => item.userId),
          blocks: article.blocks.length
            ? article.blocks.map((block) => {
                const content = block.content as {
                  text?: string;
                  items?: string[];
                };
                return {
                  type: block.type as
                    | "HEADING_2"
                    | "HEADING_3"
                    | "PARAGRAPH"
                    | "LIST"
                    | "QUOTE"
                    | "CALLOUT"
                    | "NOTE"
                    | "CONCLUSION",
                  text:
                    block.type === "LIST"
                      ? (content.items || []).join("\n")
                      : content.text || "",
                };
              })
            : [{ type: "PARAGRAPH", text: article.body }],
        }}
      />
    </div>
  );
}
