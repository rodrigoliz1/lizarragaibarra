import type { Metadata } from "next";
import { PageIntro, ContactCta } from "@/components/public/shared";
import { PracticeSelector } from "@/components/public/practice-selector";
import { legalSolutions } from "@/data/practice-areas";
export const metadata: Metadata = {
  title: "Servicios jurídicos",
  alternates: { canonical: "/servicios" },
};
export default function Services() {
  return (
    <>
      <PageIntro
        eyebrow="Áreas de práctica"
        title="La estrategia adecuada para cada controversia."
        description="Litigio civil, mercantil, constitucional y administrativo. Negociación y prevención para proteger lo que importa."
      />
      <section className="practice-section">
        <div className="li-container">
          <PracticeSelector />
        </div>
      </section>
      <section className="li-container page-content" id="prevencion">
        <div className="section-heading">
          <div>
            <p className="li-label">Prevención y estrategia</p>
            <h2>
              Entregables concretos.
              <br />
              Decisiones informadas.
            </h2>
          </div>
          <p>
            El alcance y los honorarios se definen por escrito,
            <br />
            de acuerdo con las necesidades del asunto.
          </p>
        </div>
        <div className="solutions-grid">
          {legalSolutions.map((s, i) => (
            <div key={s}>
              <span>0{i + 1}</span>
              <h3>{s}</h3>
            </div>
          ))}
        </div>
      </section>
      <ContactCta />
    </>
  );
}
