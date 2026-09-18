import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageIntro, ContactCta } from "@/components/public/shared";
import { practiceAreas } from "@/data/practice-areas";
import { getPublicTeam } from "@/server/services/public-content-service";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = practiceAreas.find((a) => a.slug === slug);
  return {
    title: area?.title,
    description: area?.summary,
    alternates: { canonical: "/servicios/" + slug },
  };
}
export default async function Service({ params }: Props) {
  const { slug } = await params;
  const area = practiceAreas.find((a) => a.slug === slug);
  if (!area) notFound();
  const team = await getPublicTeam();
  return (
    <>
      <PageIntro
        eyebrow={"Práctica " + area.index}
        title={area.title}
        description={area.summary}
      />
      <section className="li-container page-content">
        <div className="profile-layout">
          <div>
            <p className="li-label">Nuestra intervención</p>
            <h2 style={{ marginTop: 24 }}>{area.shortDescription}</h2>
          </div>
          <div className="profile-bio">
            <ul>
              {area.services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p style={{ marginTop: 30 }}>
              La viabilidad de cada vía se analiza a partir de los hechos,
              documentos y circunstancias particulares. Definimos una estrategia
              y mantenemos un seguimiento cercano hasta la conclusión de nuestra
              intervención.
            </p>
            <Link href="/agendar" className="li-button">
              Consultar sobre esta área <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="li-container page-content">
        <p className="li-label">Contacto directo</p>
        {team
          .filter((l) => area.relatedLawyerSlugs.includes(l.slug))
          .map((l) => (
            <div className="service-person" key={l.slug}>
              <h3>{l.name}</h3>
              <Link href={"/equipo/" + l.slug} className="li-text-link">
                Conocer su perfil <ArrowUpRight size={16} />
              </Link>
            </div>
          ))}
      </section>
      <ContactCta />
    </>
  );
}
