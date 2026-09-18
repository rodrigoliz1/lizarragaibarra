import Link from "next/link";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

export default async function PublishedArticlesPage() {
  const articles = await db.article.findMany({
    where: { status: "PUBLISHED" },
    include: { author: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
  });
  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Biblioteca pública"
        title="Insights publicados"
        description="Inventario publicado con autor derivado de su cuenta profesional."
      />
      <section className="grid gap-4 lg:grid-cols-3">
        {articles.map((article) => (
          <article
            key={article.id}
            className="rounded-2xl border border-black/10 bg-white p-6"
          >
            <AdminStatus tone="green">Publicado</AdminStatus>
            <h2 className="mt-6 font-serif text-3xl">{article.title}</h2>
            <p className="mt-3 text-sm text-black/45">
              Artículo creado por{" "}
              {article.author?.name || "LIZÁRRAGA & IBARRA ABOGADOS"}
            </p>
            <Link
              href={`/insights/${article.slug}`}
              className="mt-6 inline-flex text-[9px] font-bold uppercase tracking-[0.14em] text-black/45"
            >
              Abrir publicación
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
