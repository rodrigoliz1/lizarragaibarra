import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HomeHero } from "@/components/public/home-hero";
import { PortalShowcase } from "@/components/public/portal-showcase";
import { PracticeSelector } from "@/components/public/practice-selector";
import { ContactCta, TeamPortrait } from "@/components/public/shared";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { editorialImages } from "@/data/editorial-images";
import { formatPhone } from "@/data/lawyers";
import { methodology } from "@/data/practice-areas";
import {
  getPublicContent,
  getPublicTeam,
} from "@/server/services/public-content-service";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const [team, { cases, articles }] = await Promise.all([
    getPublicTeam(),
    getPublicContent(),
  ]);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LegalService",
          name: siteConfig.name,
          url: siteConfig.url,
          email: siteConfig.contact.email,
          telephone: siteConfig.contact.phoneHref,
          logo: `${siteConfig.url}/brand/wordmark-transparent.png`,
        }}
      />
      <HomeHero />

      <section className="home-firm" id="firma">
        <div className="li-container home-firm-grid">
          <div className="firm-image-wrap">
            <Image
              alt={editorialImages.firm.alt}
              className="object-cover"
              fill
              sizes="(max-width: 820px) 100vw, 43vw"
              src={editorialImages.firm.src}
            />
            <div aria-hidden="true" className="firm-image-tone" />
            <span>Arquitectura de una estrategia</span>
            <a
              href={editorialImages.firm.sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {editorialImages.firm.credit}
            </a>
          </div>
          <div className="firm-statement">
            <p className="li-label">01 / La firma</p>
            <h2>El conflicto exige una lectura completa.</h2>
            <div className="firm-copy-columns">
              <p>
                Cada controversia reúne hechos, documentos, intereses y
                decisiones que no admiten respuestas genéricas. Comprendemos
                primero lo que está en juego.
              </p>
              <p>
                Construimos una estrategia jurídica propia, ejecutable y clara.
                Los socios dirigen el asunto y mantienen la comunicación durante
                cada etapa.
              </p>
            </div>
            <Link className="li-editorial-link" href="/nosotros">
              Conocer nuestra forma de ejercer{" "}
              <ArrowUpRight aria-hidden size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-practices">
        <div className="li-container">
          <div className="home-section-heading inverse">
            <div>
              <p className="li-label">02 / Áreas de práctica</p>
              <h2>
                Defensa especializada.
                <br />
                Visión integral.
              </h2>
            </div>
            <p>
              Litigio y prevención para proteger patrimonio, operaciones y
              derechos frente a escenarios de alta complejidad.
            </p>
          </div>
          <PracticeSelector />
        </div>
      </section>

      <section className="home-method">
        <div className="li-container">
          <div className="home-section-heading">
            <div>
              <p className="li-label">03 / Método de trabajo</p>
              <h2>
                Una ruta clara.
                <br />
                En cada etapa.
              </h2>
            </div>
            <p>El método da dirección. La comunicación da certeza.</p>
          </div>
          <ol className="method-grid">
            {methodology.map((step, index) => (
              <li key={step.title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {cases.length > 0 ? (
        <section className="home-cases">
          <div className="li-container">
            <div className="home-section-heading inverse">
              <div>
                <p className="li-label">Experiencia</p>
                <h2>Casos representativos.</h2>
              </div>
              <p>
                Resultados publicados únicamente cuando existe autorización.
              </p>
            </div>
            <div className="case-editorial-list">
              {cases.slice(0, 3).map((caseStudy, index) => (
                <Link
                  href={`/casos-de-exito/${caseStudy.slug}`}
                  key={caseStudy.id}
                >
                  <span>0{index + 1}</span>
                  <small>{caseStudy.practiceArea}</small>
                  <h3>{caseStudy.title}</h3>
                  <ArrowUpRight aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {team.length > 0 ? (
        <section className="home-team">
          <div className="li-container">
            <div className="home-section-heading inverse">
              <div>
                <p className="li-label">04 / Los socios</p>
                <h2>La estrategia tiene responsables.</h2>
              </div>
              <Link className="li-editorial-link light-link" href="/equipo">
                Conocer al equipo <ArrowUpRight aria-hidden size={17} />
              </Link>
            </div>
            <div className="home-team-grid">
              {team.slice(0, 2).map((lawyer, index) => (
                <article className="home-team-member" key={lawyer.slug}>
                  <Link href={`/equipo/${lawyer.slug}`}>
                    <TeamPortrait lawyer={lawyer} priority={index === 0} />
                    <div className="home-team-name">
                      <div>
                        <span>{lawyer.role}</span>
                        <h3>{lawyer.name}</h3>
                      </div>
                      <ArrowUpRight aria-hidden size={25} />
                    </div>
                  </Link>
                  <p>{lawyer.primaryArea}</p>
                  <div className="home-team-contact">
                    <a href={`mailto:${lawyer.email}`}>{lawyer.email}</a>
                    <a
                      href={`https://wa.me/${lawyer.whatsapp}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      WhatsApp · {formatPhone(lawyer.phone)}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="home-portal">
        <div className="li-container home-portal-grid">
          <div className="portal-copy">
            <p className="li-label">05 / Portal privado</p>
            <h2>
              Su asunto,
              <br />
              siempre a la vista.
            </h2>
            <p>
              Consulte avances, documentos y comunicaciones dentro de un espacio
              reservado para clientes de la firma.
            </p>
            <Link className="li-button" href="/portal">
              Acceder al portal <ArrowUpRight aria-hidden size={16} />
            </Link>
            <small>
              La interfaz mostrada utiliza información demostrativa.
            </small>
          </div>
          <PortalShowcase />
        </div>
      </section>

      {articles.length > 0 ? (
        <section className="home-insights">
          <div className="li-container">
            <div className="home-section-heading inverse">
              <div>
                <p className="li-label">Insights</p>
                <h2>Perspectivas para decidir.</h2>
              </div>
              <Link className="li-editorial-link light-link" href="/insights">
                Ver todos <ArrowUpRight aria-hidden size={17} />
              </Link>
            </div>
            <div className="insight-list">
              {articles.slice(0, 3).map((article, index) => (
                <Link href={`/insights/${article.slug}`} key={article.id}>
                  <span>0{index + 1}</span>
                  <h3>{article.title}</h3>
                  <ArrowUpRight aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <ContactCta />
    </>
  );
}
