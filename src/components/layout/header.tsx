"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "./logo";
export function Header({
  hasCases = false,
  hasInsights = false,
}: {
  hasCases?: boolean;
  hasInsights?: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const onHome = pathname === "/";
  const onHomeHero = onHome && !scrolled;
  const links = [
    { label: "Firma", href: "/nosotros" },
    { label: "Equipo", href: "/equipo" },
    { label: "Servicios", href: "/servicios" },
    ...(hasCases ? [{ label: "Casos", href: "/casos-de-exito" }] : []),
    ...(hasInsights ? [{ label: "Insights", href: "/insights" }] : []),
    { label: "Portal", href: "/portal" },
  ];
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 20);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  function close() {
    dialog.current?.close();
    document.body.style.overflow = "";
    trigger.current?.focus();
  }
  return (
    <header
      className={`li-header ${scrolled ? "is-scrolled" : ""} ${onHome ? "home-header" : ""} ${onHomeHero ? "over-hero" : ""}`}
    >
      <div className="li-header-inner">
        <Logo inverse={onHome} />
        <nav aria-label="Navegación principal" className="desktop-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "page"
                  : undefined
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            className={`li-button header-book ${onHome ? "light" : ""}`}
            href="/agendar"
          >
            Agendar consulta <ArrowUpRight size={15} aria-hidden />
          </Link>
          <button
            className="mobile-menu-trigger"
            ref={trigger}
            onClick={() => {
              dialog.current?.showModal();
              document.body.style.overflow = "hidden";
            }}
            aria-label="Abrir menú"
          >
            <Menu size={23} />
          </button>
        </div>
      </div>
      <dialog
        className="li-mobile-menu"
        ref={dialog}
        onCancel={close}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div className="mobile-menu-top">
          <Logo inverse />
          <button onClick={close} aria-label="Cerrar menú">
            <X />
          </button>
        </div>
        <nav aria-label="Navegación móvil">
          {links.map((link, i) => (
            <Link href={link.href} key={link.href} onClick={close}>
              <small>0{i + 1}</small>
              {link.label}
              <ArrowUpRight size={20} />
            </Link>
          ))}
          <Link className="li-button light" href="/agendar" onClick={close}>
            Agendar consulta
          </Link>
        </nav>
      </dialog>
    </header>
  );
}
