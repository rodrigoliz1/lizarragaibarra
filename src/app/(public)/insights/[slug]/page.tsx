import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageIntro, ContactCta } from "@/components/public/shared";
import { ArticleBody } from "@/components/public/article-body";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { cache } from "react";
const getArticle = cache(async (slug: string) =>
  db.article.findFirst({
    where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    include: {
      blocks: { orderBy: { sortOrder: "asc" } },
      author: { select: { name: true } },
      heroMedia: true,
    },
  }),
);
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return {};
  return {
    title: a.seoTitle || a.title,
    description: a.seoDescription || a.excerpt,
    alternates: { canonical: "/insights/" + slug },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.excerpt,
      publishedTime: a.publishedAt?.toISOString(),
    },
  };
}
export default async function Article({ params }: Props) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          datePublished: a.publishedAt?.toISOString(),
          author: {
            "@type": a.author ? "Person" : "Organization",
            name: a.author?.name || siteConfig.name,
          },
          publisher: { "@type": "Organization", name: siteConfig.name },
        }}
      />
      <PageIntro eyebrow="Insights" title={a.title} description={a.excerpt} />
      <article className="li-container page-content">
        <div className="prose-li" style={{ marginInline: "auto" }}>
          <p className="li-label">
            {a.author?.name || siteConfig.name} ·{" "}
            {a.publishedAt?.toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {a.heroMedia && (
            <Image
              src={"/api/media/" + a.heroMedia.id}
              width={a.heroMedia.width}
              height={a.heroMedia.height}
              alt={a.heroMedia.altText}
              unoptimized
            />
          )}
          {a.introduction && <p>{a.introduction}</p>}
          <ArticleBody blocks={a.blocks} />
          {a.conclusion && <p>{a.conclusion}</p>}
          {Array.isArray(a.references) && a.references.length > 0 && (
            <>
              <h2>Referencias</h2>
              <ul>
                {a.references.map((r, i) => (
                  <li key={i}>{String(r)}</li>
                ))}
              </ul>
            </>
          )}
          <p className="article-disclaimer">
            {a.legalNotice ||
              "Este contenido es informativo y no constituye asesoría jurídica individualizada. Cada asunto requiere un análisis de sus hechos y documentos."}
          </p>
        </div>
      </article>
      <ContactCta />
    </>
  );
}
