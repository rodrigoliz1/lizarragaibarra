import type { Metadata } from "next";
import { PageIntro, ContactCta } from "@/components/public/shared";
import { methodology } from "@/data/practice-areas";
export const metadata: Metadata = {
  title: "La firma",
  description:
    "Nuestra práctica integra litigio, consultoría preventiva y mecanismos alternativos de solución de controversias.",
  alternates: { canonical: "/nosotros" },
};
export default function Firm() {
  return (
    <>
      <PageIntro
        eyebrow="La firma"
        title="Una visión compartida. Una defensa cercana."
        description="Lizárraga & Ibarra es una firma orientada a la prevención, gestión y solución de controversias. El rigor jurídico y la atención personal guían nuestra práctica."
      />
      <section className="li-container page-content">
        <div className="firm-intro" style={{ padding: 0, border: 0 }}>
          <p className="li-label">Nuestro compromiso</p>
          <div className="prose-li">
            <h2>Comprender antes de actuar.</h2>
            <p>
              Entendemos cada asunto como una decisión jurídica y de negocio.
              Nuestra estrategia parte de un diagnóstico integral: hechos,
              documentos, riesgos, vías procesales, costos, tiempos y
              posibilidades de ejecución.
            </p>
            <p>
              Acompañamos a personas, empresas, propietarios, inversionistas y
              organizaciones que requieren una defensa técnicamente sólida y
              comunicación clara. Evaluamos tanto la vía judicial como las
              alternativas de negociación.
            </p>
            <h2>
              Atención directa.
              <br />
              Criterio independiente.
            </h2>
            <p>
              Los socios participan en el análisis y seguimiento de los asuntos.
              Definimos por escrito el alcance de nuestra intervención y
              mantenemos al cliente informado sobre los avances y decisiones que
              requieren su participación.
            </p>
          </div>
        </div>
      </section>
      <section className="li-container methodology">
        <div className="section-heading">
          <h2>
            La forma importa.
            <br />
            El fondo, también.
          </h2>
        </div>
        <ol>
          {methodology.map((s, i) => (
            <li key={s.title}>
              <span>0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </li>
          ))}
        </ol>
      </section>
      <ContactCta />
    </>
  );
}
