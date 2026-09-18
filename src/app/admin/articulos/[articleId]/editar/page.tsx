import { notFound } from "next/navigation";

import { AdminHeading } from "@/components/admin/admin-primitives";
import { ArticleEditor } from "@/components/articles/article-editor";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";

export default async function AdminEditArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const [{ articleId }] = await Promise.all([params, requireAdmin()]);
  const [article, practiceAreas, authors] = await Promise.all([
    db.article.findUnique({
      where: { id: articleId },
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
      where: { role: "LAWYER", status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!article) notFound();
  return (
    <div className="space-y-8 text-white">
      <AdminHeading
        eyebrow="Edición editorial"
        title={article.title}
        description="Modifica contenido, imagen, área y coautoría sin perder el historial auditado."
      />
      <div className="rounded-[28px] bg-[#080808] p-4 sm:p-7">
        <ArticleEditor
          editBasePath="/admin/articulos"
          practiceAreas={practiceAreas}
          authors={authors.filter((author) => author.id !== article.authorId)}
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
    </div>
  );
}
