import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { editorialImages } from "@/data/editorial-images";
import { HomeHeroParallax } from "@/components/public/home-hero-parallax";

export function HomeHero() {
  return (
    <section className="li-home-hero" data-home-hero>
      <div
        aria-hidden="true"
        className="hero-cinematic"
        data-hero-parallax="image"
      >
        <Image
          alt=""
          className="object-cover"
          fetchPriority="high"
          fill
          loading="eager"
          sizes="(max-width: 700px) 125vw, (max-width: 1000px) 76vw, 63vw"
          src={editorialImages.hero.src}
        />
      </div>
      <div aria-hidden="true" className="hero-cinematic-shade" />
      <div aria-hidden="true" className="hero-watermark">
        <Image
          alt=""
          fill
          loading="eager"
          sizes="(max-width: 700px) 72vw, 45vw"
          src="/brand/monogram-inverse-transparent.png"
        />
      </div>

      <div className="li-container hero-content" data-hero-parallax="content">
        <div className="hero-message">
          <h1>
            {["Litigio con", "estrategia.", "Defensa con precisión."].map(
              (line) => (
                <span className="hero-line" key={line}>
                  <span>{line}</span>
                </span>
              ),
            )}
          </h1>
          <div className="hero-support">
            <p>
              Representamos personas y empresas en controversias complejas con
              rigor jurídico, lectura estratégica y atención directa de los
              socios.
            </p>
            <div className="hero-actions">
              <Link
                className="li-button light"
                data-analytics="click_agendar"
                href="/agendar"
              >
                Agendar consulta <ArrowUpRight aria-hidden size={16} />
              </Link>
              <Link className="li-ghost-link" href="/nosotros">
                Conocer la firma <ArrowUpRight aria-hidden size={15} />
              </Link>
            </div>
          </div>
        </div>

        <div className="hero-rail">
          <a href="#firma">
            Explorar <ArrowDown aria-hidden size={14} />
          </a>
          <span>Civil · Mercantil · Constitucional · Administrativo</span>
          <a
            href={editorialImages.hero.sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {editorialImages.hero.credit}
          </a>
        </div>
      </div>
      <HomeHeroParallax />
    </section>
  );
}
