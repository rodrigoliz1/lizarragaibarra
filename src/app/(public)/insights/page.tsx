import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PageIntro, ContactCta } from "@/components/public/shared";
import { getPublicContent } from "@/server/services/public-content-service";
export const metadata: Metadata = {
  title: "Insights",
  alternates: { canonical: "/insights" },
};
export default async function Insights() {
  const { articles } = await getPublicContent();
  return (
    <>
      <PageIntro
        eyebrow="Insights"
        title="Perspectivas para decidir."
        description="Análisis jurídicos y reflexiones sobre los asuntos que inciden en las decisiones de personas y empresas."
      />
      {articles.length > 0 && (
        <section className="li-container editorial-list">
          {articles.map((a) => (
            <Link href={"/insights/" + a.slug} key={a.id}>
              <span>{a.practiceArea?.name || "Análisis jurídico"}</span>
              <div>
                <h3>{a.title}</h3>
                <p>{a.excerpt}</p>
              </div>
              <ArrowUpRight />
            </Link>
          ))}
        </section>
      )}
      <ContactCta />
    </>
  );
}
