import { notFound } from "next/navigation";

import { ArticleWorkflowButton } from "@/components/articles/article-workflow-button";
import { ArticleManagementActions } from "@/components/articles/article-management-actions";
import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const [{ articleId }, actor] = await Promise.all([
    params,
    requireActor(["LAWYER"]),
  ]);
  const article = await db.article.findFirst({
    where: { id: articleId, authorId: actor.id },
    include: {
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
      <SectionHeading
        eyebrow="Detalle editorial"
        title={article.title}
        description={article.excerpt}
      />
      <div className="flex items-center justify-between gap-4">
        <StatusPill
          tone={
            article.status === "PUBLISHED"
              ? "green"
              : article.status === "CHANGES_REQUESTED"
                ? "gold"
                : "neutral"
          }
        >
          {article.status.replaceAll("_", " ")}
        </StatusPill>
        {["DRAFT", "CHANGES_REQUESTED"].includes(article.status) ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <ArticleWorkflowButton
              articleId={article.id}
              canPublish={actor.lawyerRank === "PARTNER"}
            />
          </div>
        ) : null}
      </div>
      <ArticleManagementActions
        articleId={article.id}
        status={article.status}
        editHref={`/portal/abogado/articulos/${article.id}/editar`}
        returnHref="/portal/abogado/articulos"
      />
      <section className="grid gap-5 lg:grid-cols-[1fr_0.65fr]">
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
                <h2 key={block.id} className="font-serif text-4xl">
                  {content.text}
                </h2>
              ) : block.type === "HEADING_3" ? (
                <h3 key={block.id} className="font-serif text-3xl">
                  {content.text}
                </h3>
              ) : block.type === "LIST" ? (
                <ul
                  key={block.id}
                  className="list-disc space-y-2 pl-5 text-white/55"
                >
                  {content.items?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p
                  key={block.id}
                  className="whitespace-pre-wrap text-sm leading-7 text-white/55"
                >
                  {content.text}
                </p>
              );
            })}
          </div>
        </article>
        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/10 p-6">
            <p className="eyebrow text-white/35">Historial</p>
            <ul className="mt-5 space-y-3">
              {article.revisions.map((revision) => (
                <li key={revision.id} className="text-xs text-white/45">
                  Versión {revision.version} ·{" "}
                  {revision.reviewStatus.replaceAll("_", " ")}
                </li>
              ))}
              {!article.revisions.length ? (
                <li className="text-xs text-white/30">
                  Sin envíos registrados.
                </li>
              ) : null}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 p-6">
            <p className="eyebrow text-white/35">Revisiones</p>
            <ul className="mt-5 space-y-4">
              {article.reviews.map((review) => (
                <li
                  key={review.id}
                  className="border-t border-white/10 pt-3 text-xs text-white/45"
                >
                  {review.decision.replaceAll("_", " ")} ·{" "}
                  {review.reviewer.name}
                  {review.comments ? (
                    <span className="mt-2 block text-white/30">
                      {review.comments}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}
