import type { Prisma } from "@prisma/client";
import { ArrowUpRight, BookOpenText, DatabaseZap } from "lucide-react";
import Link from "next/link";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

const articleSelect = {
  id: true,
  slug: true,
  title: true,
  status: true,
  readingMinutes: true,
  publishedAt: true,
  updatedAt: true,
  author: { select: { name: true } },
  practiceArea: { select: { name: true } },
} satisfies Prisma.ArticleSelect;

type ArticleRow = Prisma.ArticleGetPayload<{
  select: typeof articleSelect;
}>;

type ArticlesResult =
  | { kind: "ready"; articles: ArticleRow[] }
  | { kind: "unavailable"; message: string };

const statusPresentation = {
  DRAFT: { label: "Borrador", tone: "neutral" },
  SUBMITTED: { label: "En revisión", tone: "blue" },
  CHANGES_REQUESTED: { label: "Correcciones", tone: "gold" },
  APPROVED: { label: "Aprobado", tone: "green" },
  PUBLISHED: { label: "Publicado", tone: "green" },
  REJECTED: { label: "Rechazado", tone: "neutral" },
  ARCHIVED: { label: "Archivado", tone: "gold" },
} as const;

export const dynamic = "force-dynamic";

async function loadArticles(): Promise<ArticlesResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      kind: "unavailable",
      message:
        "La base de datos no está configurada en este entorno. No se muestra un inventario simulado.",
    };
  }

  try {
    const articles = await db.article.findMany({
      select: articleSelect,
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      take: 100,
    });
    return { kind: "ready", articles };
  } catch {
    return {
      kind: "unavailable",
      message:
        "No fue posible consultar el inventario editorial. Verifica la conexión y las migraciones.",
    };
  }
}

export default async function ArticlesAdminPage() {
  const result = await loadArticles();

  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Conocimiento"
        title="Artículos"
        description="Inventario editorial y estado de publicación obtenidos del repositorio."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/articulos/nuevo" className="li-button">
              Nuevo Insight ↗
            </Link>
            <Link
              href="/admin/articulos/pendientes"
              className="inline-flex items-center rounded-xl bg-black px-4 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-white"
            >
              Pendientes
            </Link>
            <Link
              href="/admin/articulos/publicados"
              className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-black/60"
            >
              Publicados
            </Link>
            <Link
              href="/insights"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-black/60 hover:border-black/20"
            >
              Ver sección pública <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        }
      />

      {result.kind === "unavailable" ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <DatabaseZap
            className="mx-auto size-8 text-black/35"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-serif text-2xl text-[#111]">
            Inventario no disponible
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            {result.message}
          </p>
        </section>
      ) : result.articles.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-12 text-center">
          <BookOpenText
            className="mx-auto size-8 text-black/35"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-serif text-2xl text-[#111]">
            Sin artículos registrados
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/50">
            El inventario aparecerá aquí cuando existan artículos en el
            repositorio. No se utilizan contenidos de demostración.
          </p>
        </section>
      ) : (
        <section
          aria-label="Inventario editorial"
          className="grid gap-4 lg:grid-cols-3"
        >
          {result.articles.map((article) => {
            const presentation = statusPresentation[article.status];

            return (
              <Link
                key={article.id}
                href={`/admin/articulos/${article.id}`}
                className="flex min-h-72 flex-col rounded-2xl border border-black/10 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-[#eeeae2] text-[#292929]">
                    <BookOpenText size={16} aria-hidden="true" />
                  </span>
                  <AdminStatus tone={presentation.tone}>
                    {presentation.label}
                  </AdminStatus>
                </div>
                <h2 className="mt-8 font-serif text-2xl leading-tight">
                  {article.title}
                </h2>
                <p className="mt-4 text-xs leading-5 text-black/45">
                  {article.practiceArea?.name ?? "Sin área asociada"}
                </p>
                <p className="mt-2 text-xs text-black/40">
                  {article.author?.name ?? "Autor no asignado"} ·{" "}
                  {article.readingMinutes} min
                </p>
                <div className="mt-auto pt-7 text-[9px] font-bold uppercase leading-5 tracking-[0.14em] text-black/30">
                  <p>Actualizado {formatDate(article.updatedAt)}</p>
                  {article.publishedAt ? (
                    <p>Publicado {formatDate(article.publishedAt)}</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-[#111] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-serif text-2xl">Vista editorial de lectura</p>
          <p className="mt-1 text-xs text-white/40">
            Abra cualquier artículo para editarlo, archivarlo, restaurarlo o
            administrar su publicación.
          </p>
        </div>
        <Link
          href="/insights"
          className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#d3d3d0] hover:text-white"
        >
          Consultar sitio público
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
