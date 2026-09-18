"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useRef } from "react";
import { editorialImages } from "@/data/editorial-images";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeHero() {
  const hero = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: hero,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", reduceMotion ? "0%" : "12%"],
  );
  const copyY = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", reduceMotion ? "0%" : "5%"],
  );

  return (
    <section className="li-home-hero" ref={hero}>
      <motion.div
        aria-hidden="true"
        className="hero-cinematic"
        style={{ y: imageY }}
      >
        <Image
          alt=""
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={editorialImages.hero.src}
        />
      </motion.div>
      <div aria-hidden="true" className="hero-cinematic-shade" />
      <div aria-hidden="true" className="hero-grid" />
      <motion.div
        animate={reduceMotion ? undefined : { opacity: 0.14, x: 0 }}
        aria-hidden="true"
        className="hero-watermark"
        initial={reduceMotion ? false : { opacity: 0, x: 28 }}
        transition={{ duration: 1.4, delay: 0.25, ease }}
      >
        <Image
          alt=""
          fill
          priority
          sizes="45vw"
          src="/brand/monogram-inverse-transparent.png"
        />
      </motion.div>

      <motion.div className="li-container hero-content" style={{ y: copyY }}>
        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="hero-kicker"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7, delay: 0.22, ease }}
        >
          Boutique de litigio · México
        </motion.p>

        <div className="hero-message">
          <h1>
            {["Litigio con", "estrategia.", "Defensa con precisión."].map(
              (line, index) => (
                <span className="hero-line" key={line}>
                  <motion.span
                    animate={{ y: "0%" }}
                    initial={reduceMotion ? false : { y: "112%" }}
                    transition={{
                      duration: 0.9,
                      delay: 0.28 + index * 0.1,
                      ease,
                    }}
                  >
                    {line}
                  </motion.span>
                </span>
              ),
            )}
          </h1>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="hero-support"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            transition={{ duration: 0.75, delay: 0.72, ease }}
          >
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
          </motion.div>
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
      </motion.div>
    </section>
  );
}
