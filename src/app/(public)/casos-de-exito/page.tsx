import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageIntro, ContactCta } from "@/components/public/shared";
import { getPublicContent } from "@/server/services/public-content-service";
export const metadata: Metadata = {
  title: "Casos de éxito",
  alternates: { canonical: "/casos-de-exito" },
};
export default async function Cases() {
  const { cases } = await getPublicContent();
  return (
    <>
      <PageIntro
        eyebrow="Experiencia en acción"
        title="La estrategia, en contexto."
        description="Una mirada al análisis, la intervención y la resolución de asuntos de nuestra práctica, con respeto a la confidencialidad de cada cliente."
      />
      {cases.length > 0 && (
        <section className="li-container editorial-list">
          {cases.map((c) => (
            <Link key={c.id} href={"/casos-de-exito/" + c.slug}>
              <span>{c.practiceArea}</span>
              <div>
                <h3>{c.title}</h3>
                <p>{c.summary}</p>
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
