import { notFound } from "next/navigation";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { ArticleReviewPanel } from "@/components/articles/article-review-panel";
import { ArticleManagementActions } from "@/components/articles/article-management-actions";
import { db } from "@/lib/db";

export default async function AdminArticleReviewPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const article = await db.article.findUnique({
    where: { id: articleId },
    include: {
      author: { include: { lawyerProfile: true } },
      blocks: { orderBy: { sortOrder: "asc" } },
      revisions: { orderBy: { version: "desc" } },
      reviews: {
        include: { reviewer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!article) notFound();
  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Revisión editorial"
        title={article.title}
        description={`${article.author?.name || "Sin autor"} · ${article.excerpt}`}
      />
      <AdminStatus
        tone={
          article.status === "PUBLISHED"
            ? "green"
            : article.status === "CHANGES_REQUESTED"
              ? "gold"
              : "blue"
        }
      >
        {article.status}
      </AdminStatus>
      <ArticleManagementActions
        articleId={article.id}
        status={article.status}
        editHref={`/admin/articulos/${article.id}/editar`}
        returnHref="/admin/articulos"
        theme="light"
      />
      <section className="grid gap-6 xl:grid-cols-[1fr_0.65fr]">
        <article className="rounded-2xl border border-black/10 bg-white p-8">
          <p className="font-serif text-2xl leading-9 text-black/65">
            {article.introduction}
          </p>
          <div className="mt-8 space-y-5">
            {article.blocks.map((block) => {
              const content = block.content as {
                text?: string;
                items?: string[];
              };
              return block.type === "HEADING_2" ? (
                <h2 key={block.id} className="font-serif text-4xl">
                  {content.text}
                </h2>
              ) : block.type === "HEADING_3" ? (
                <h3 key={block.id} className="font-serif text-3xl">
                  {content.text}
                </h3>
              ) : block.type === "LIST" ? (
                <ul className="list-disc pl-5 text-black/60" key={block.id}>
                  {content.items?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p
                  key={block.id}
                  className="whitespace-pre-wrap text-sm leading-7 text-black/60"
                >
                  {content.text}
                </p>
              );
            })}
          </div>
          <footer className="mt-10 border-t border-black/10 pt-6 text-sm text-black/45">
            Artículo creado por{" "}
            {article.author?.name || "LIZÁRRAGA & IBARRA ABOGADOS"}
          </footer>
        </article>
        <aside className="space-y-5">
          <ArticleReviewPanel articleId={article.id} />
          <section className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-serif text-2xl">Versiones</h2>
            <ul className="mt-4 space-y-2 text-xs text-black/45">
              {article.revisions.map((revision) => (
                <li key={revision.id}>
                  v{revision.version} · {revision.reviewStatus}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="font-serif text-2xl">Decisiones</h2>
            <ul className="mt-4 space-y-3">
              {article.reviews.map((review) => (
                <li
                  key={review.id}
                  className="border-t border-black/10 pt-3 text-xs"
                >
                  {review.decision} · {review.reviewer.name}
                  {review.comments ? (
                    <span className="block text-black/40">
                      {review.comments}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
