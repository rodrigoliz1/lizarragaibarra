"use client";

import { useEffect } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function HomeHeroParallax() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-home-hero]");
    const image = hero?.querySelector<HTMLElement>(
      '[data-hero-parallax="image"]',
    );
    const content = hero?.querySelector<HTMLElement>(
      '[data-hero-parallax="content"]',
    );

    if (!hero || !image || !content) return;

    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    let animationFrame = 0;

    const update = () => {
      animationFrame = 0;

      if (reducedMotion.matches) {
        image.style.transform = "";
        content.style.transform = "";
        return;
      }

      const bounds = hero.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -bounds.top / bounds.height));

      image.style.transform = `translate3d(0, ${progress * 12}%, 0)`;
      content.style.transform = `translate3d(0, ${progress * 5}%, 0)`;
    };

    const scheduleUpdate = () => {
      if (!animationFrame)
        animationFrame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    reducedMotion.addEventListener("change", scheduleUpdate);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      reducedMotion.removeEventListener("change", scheduleUpdate);
    };
  }, []);

  return null;
}
