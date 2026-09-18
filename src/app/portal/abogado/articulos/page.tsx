import { Plus } from "lucide-react";
import Link from "next/link";

import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requireActor } from "@/server/policies";

export default async function LawyerArticlesPage() {
  const actor = await requireActor(["LAWYER"]);
  const articles = await db.article.findMany({
    where: { authorId: actor.id },
    include: { reviews: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Conocimiento LI"
        title="Mis artículos"
        description="Borradores, revisiones, correcciones y publicaciones bajo una misma estructura editorial."
        action={
          <Link
            href="/portal/abogado/articulos/nuevo"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-black"
          >
            <Plus className="size-3" /> Nuevo artículo
          </Link>
        }
      />
      <section className="grid gap-4 lg:grid-cols-2">
        {articles.map((article) => (
          <Link
            href={`/portal/abogado/articulos/${article.id}`}
            key={article.id}
            className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 hover:border-white/25"
          >
            <div className="flex items-center justify-between">
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
              <span className="text-xs text-white/25">
                v{article.updatedAt.getTime().toString().slice(-4)}
              </span>
            </div>
            <h2 className="mt-6 font-serif text-3xl">{article.title}</h2>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/45">
              {article.excerpt}
            </p>
            {article.reviews[0]?.comments ? (
              <p className="mt-5 border-t border-white/10 pt-4 text-xs text-white/35">
                Último comentario: {article.reviews[0].comments}
              </p>
            ) : null}
          </Link>
        ))}
        {!articles.length ? (
          <p className="text-sm text-white/40">Aún no ha creado artículos.</p>
        ) : null}
      </section>
    </div>
  );
}
