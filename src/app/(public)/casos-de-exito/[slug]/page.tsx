import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { PageIntro, ContactCta } from "@/components/public/shared";
import { CaseBody } from "@/components/public/case-body";
const getCase = cache(async (slug: string) =>
  db.caseStudy.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      visibility: { in: ["PUBLIC", "ANONYMIZED"] },
      publishedAt: { lte: new Date() },
    },
    include: { coverImage: true },
  }),
);
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCase(slug);
  if (!c) return {};
  return {
    title: c.seoTitle || c.title,
    description: c.seoDescription || c.summary,
    alternates: { canonical: "/casos-de-exito/" + slug },
  };
}
export default async function Case({ params }: Props) {
  const { slug } = await params;
  const c = await getCase(slug);
  if (!c) notFound();
  return (
    <>
      <PageIntro
        eyebrow={c.practiceArea}
        title={c.title}
        description={c.summary}
      />
      <article className="li-container page-content">
        {c.coverImage && (
          <Image
            src={"/api/media/" + c.coverImage.id}
            alt={c.coverImage.altText}
            width={c.coverImage.width}
            height={c.coverImage.height}
            unoptimized
            className="case-cover"
          />
        )}
        <CaseBody study={c} />
        <p className="article-disclaimer">
          {c.visibility === "ANONYMIZED"
            ? "Se han reservado los datos de identificación para proteger la confidencialidad. "
            : ""}
          Los resultados dependen de las circunstancias particulares de cada
          asunto y no constituyen una garantía de resultados futuros.
        </p>
      </article>
      <ContactCta />
    </>
  );
}
