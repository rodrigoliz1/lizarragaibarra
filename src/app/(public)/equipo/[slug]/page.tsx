import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { PageIntro, TeamPortrait } from "@/components/public/shared";
import { getPublicTeam } from "@/server/services/public-content-service";
import { formatPhone } from "@/data/lawyers";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = (await getPublicTeam()).find((x) => x.slug === slug);
  return {
    title: l?.name,
    description: l?.biography[1],
    alternates: { canonical: "/equipo/" + slug },
  };
}
export default async function Profile({ params }: Props) {
  const { slug } = await params;
  const l = (await getPublicTeam()).find((x) => x.slug === slug);
  if (!l) notFound();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: l.name,
          jobTitle: l.role,
          email: l.email,
          telephone: "+52" + l.phone,
          url: siteConfig.url + "/equipo/" + slug,
          worksFor: { "@type": "Organization", name: siteConfig.name },
          alumniOf: {
            "@type": "CollegeOrUniversity",
            name: "Universidad Panamericana",
          },
        }}
      />
      <PageIntro eyebrow={l.role} title={l.name} description={l.primaryArea} />
      <section className="li-container page-content profile-layout">
        <div>
          <TeamPortrait lawyer={l} priority />
          <div className="profile-contact">
            <a href={"mailto:" + l.email}>{l.email}</a>
            <a href={"tel:+52" + l.phone}>+52 {formatPhone(l.phone)}</a>
            <a className="li-button" href={"https://wa.me/" + l.whatsapp}>
              Conversar por WhatsApp <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        <div className="profile-bio">
          <h2>Semblanza</h2>
          {l.biography.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="li-label">Formación</p>
          {l.education.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="li-label">Enfoque de práctica</p>
          <ul>
            {l.focus.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
