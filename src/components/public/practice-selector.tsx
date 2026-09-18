"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { editorialImages } from "@/data/editorial-images";
import { practiceAreas } from "@/data/practice-areas";

export function PracticeSelector() {
  const [active, setActive] = useState(practiceAreas[0].slug);
  const reduceMotion = useReducedMotion();
  const selected =
    practiceAreas.find((area) => area.slug === active) ?? practiceAreas[0];
  const image =
    editorialImages[selected.slug as keyof typeof editorialImages] ??
    editorialImages.firm;

  return (
    <div className="practice-experience">
      <div className="practice-index">
        {practiceAreas.map((area) => (
          <button
            aria-pressed={active === area.slug}
            className={active === area.slug ? "selected" : ""}
            key={area.slug}
            onClick={() => setActive(area.slug)}
            onFocus={() => setActive(area.slug)}
            onMouseEnter={() => setActive(area.slug)}
            type="button"
          >
            <span>{area.index}</span>
            <strong>{area.title}</strong>
            <ArrowUpRight aria-hidden size={19} />
          </button>
        ))}
      </div>
      <div className="practice-visual">
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="practice-image"
            exit={reduceMotion ? undefined : { opacity: 0 }}
            initial={reduceMotion ? false : { opacity: 0, scale: 1.015 }}
            key={selected.slug}
            transition={{ duration: 0.45 }}
          >
            <Image
              alt={image.alt}
              className="object-cover"
              fill
              sizes="(max-width: 900px) 100vw, 48vw"
              src={image.src}
            />
            <div aria-hidden="true" className="practice-image-shade" />
          </motion.div>
        </AnimatePresence>
        <div className="practice-copy">
          <p>{selected.summary}</p>
          <ul>
            {selected.services.slice(0, 3).map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
          <Link href={`/servicios/${selected.slug}`}>
            Explorar esta práctica <ArrowUpRight aria-hidden size={16} />
          </Link>
        </div>
        <a
          className="image-credit"
          href={image.sourceUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {image.credit}
        </a>
      </div>
    </div>
  );
}
