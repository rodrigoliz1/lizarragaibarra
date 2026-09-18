import type { Metadata } from "next";
import { PageIntro, ContactCta, TeamMember } from "@/components/public/shared";
import { getPublicTeam } from "@/server/services/public-content-service";
export const metadata: Metadata = {
  title: "Nuestro equipo",
  alternates: { canonical: "/equipo" },
};
export default async function Team() {
  const team = await getPublicTeam();
  return (
    <>
      <PageIntro
        eyebrow="Equipo"
        title="Criterio jurídico. Compromiso personal."
        description="Una práctica cercana, con participación directa de los socios en la estrategia y el seguimiento de cada asunto."
      />
      <section className="li-container page-content">
        <div className="team-grid">
          {team.map((l) => (
            <TeamMember lawyer={l} key={l.slug} />
          ))}
        </div>
      </section>
      <ContactCta />
    </>
  );
}
