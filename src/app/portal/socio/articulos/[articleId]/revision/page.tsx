import { notFound } from "next/navigation";

import { ArticleReviewPanel } from "@/components/articles/article-review-panel";
import { SectionHeading } from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requirePartner } from "@/server/policies";

export default async function PartnerArticleReview({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  await requirePartner();
  const { articleId } = await params;
  const article = await db.article.findUnique({
    where: { id: articleId },
    include: {
      author: { select: { name: true } },
      blocks: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!article) notFound();
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={`Revisión · ${article.author?.name || "Sin autor"}`}
        title={article.title}
        description={article.excerpt}
      />
      <section className="grid gap-6 xl:grid-cols-[1fr_0.65fr]">
        <article className="rounded-2xl border border-white/10 p-7">
          <p className="font-serif text-2xl leading-9 text-white/70">
            {article.introduction}
          </p>
          <div className="mt-8 space-y-5">
            {article.blocks.map((block) => {
              const content = block.content as {
                text?: string;
                items?: string[];
              };
              return block.type === "HEADING_2" ? (
                <h2 className="font-serif text-4xl" key={block.id}>
                  {content.text}
                </h2>
              ) : block.type === "LIST" ? (
                <ul className="list-disc pl-5 text-white/55" key={block.id}>
                  {content.items?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p
                  className="whitespace-pre-wrap text-sm leading-7 text-white/55"
                  key={block.id}
                >
                  {content.text}
                </p>
              );
            })}
          </div>
        </article>
        <ArticleReviewPanel articleId={article.id} />
      </section>
    </div>
  );
}
