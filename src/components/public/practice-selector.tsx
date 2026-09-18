"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { editorialImages } from "@/data/editorial-images";
import { practiceAreas } from "@/data/practice-areas";

export function PracticeSelector() {
  const [active, setActive] = useState(practiceAreas[0].slug);
  const [previous, setPrevious] = useState<string | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selected =
    practiceAreas.find((area) => area.slug === active) ?? practiceAreas[0];
  const image =
    editorialImages[selected.slug as keyof typeof editorialImages] ??
    editorialImages.firm;
  const previousArea = practiceAreas.find((area) => area.slug === previous);
  const previousImage = previousArea
    ? (editorialImages[previousArea.slug as keyof typeof editorialImages] ??
      editorialImages.firm)
    : null;

  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    },
    [],
  );

  function selectArea(slug: string) {
    if (slug === active) return;

    setPrevious(active);
    setActive(slug);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => setPrevious(null), 450);
  }

  return (
    <div className="practice-experience">
      <div className="practice-index">
        {practiceAreas.map((area) => (
          <button
            aria-pressed={active === area.slug}
            className={active === area.slug ? "selected" : ""}
            key={area.slug}
            onClick={() => selectArea(area.slug)}
            onFocus={() => selectArea(area.slug)}
            onMouseEnter={() => selectArea(area.slug)}
            type="button"
          >
            <span>{area.index}</span>
            <strong>{area.title}</strong>
            <ArrowUpRight aria-hidden size={19} />
          </button>
        ))}
      </div>
      <div className="practice-visual">
        {previousImage ? (
          <div className="practice-image is-leaving">
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(max-width: 900px) 100vw, 48vw"
              src={previousImage.src}
            />
            <div aria-hidden="true" className="practice-image-shade" />
          </div>
        ) : null}
        <div
          className={
            previousImage ? "practice-image is-entering" : "practice-image"
          }
        >
          <Image
            alt={image.alt}
            className="object-cover"
            fill
            loading="eager"
            sizes="(max-width: 900px) 100vw, 48vw"
            src={image.src}
          />
          <div aria-hidden="true" className="practice-image-shade" />
        </div>
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
