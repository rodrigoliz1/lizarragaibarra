import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { formatPhone, type Lawyer } from "@/data/lawyers";
export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="li-container page-intro">
      <div className="page-breadcrumb">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <span>{eyebrow}</span>
      </div>
      <p className="li-label">{eyebrow}</p>
      <div className="page-intro-grid">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </section>
  );
}
export function ContactCta() {
  return (
    <section className="contact-cta li-container">
      <p className="li-label">El siguiente paso</p>
      <div>
        <h2>
          Conversemos
          <br />
          sobre su asunto.
        </h2>
        <Link
          href="/agendar"
          className="li-circle-link"
          aria-label="Agendar una consulta"
        >
          <ArrowUpRight strokeWidth={1} size={48} />
        </Link>
      </div>
      <p>Una conversación para comprender. Una estrategia para avanzar.</p>
    </section>
  );
}
export function TeamPortrait({
  lawyer,
  priority = false,
}: {
  lawyer: Lawyer;
  priority?: boolean;
}) {
  return (
    <div className={`team-portrait ${lawyer.image ? "" : "without-photo"}`}>
      {lawyer.image ? (
        <Image
          src={lawyer.image}
          alt={lawyer.imageAlt || lawyer.name}
          fill
          sizes="(max-width: 700px) 90vw, 40vw"
          priority={priority}
        />
      ) : (
        <div className="portrait-monogram" aria-label={lawyer.name}>
          <span>{lawyer.initials}</span>
          <small>Lizárraga & Ibarra</small>
        </div>
      )}
    </div>
  );
}
export function TeamMember({ lawyer }: { lawyer: Lawyer }) {
  return (
    <article className="team-member">
      <Link href={"/equipo/" + lawyer.slug}>
        <TeamPortrait lawyer={lawyer} />
        <div className="team-title">
          <div>
            <p className="li-label">{lawyer.role}</p>
            <h3>{lawyer.name}</h3>
          </div>
          <ArrowUpRight size={23} />
        </div>
      </Link>
      <p className="team-area">{lawyer.primaryArea}</p>
      <div className="team-contact">
        <a href={"mailto:" + lawyer.email}>{lawyer.email}</a>
        <a href={"https://wa.me/" + lawyer.whatsapp}>
          WhatsApp · {formatPhone(lawyer.phone)}
        </a>
      </div>
    </article>
  );
}
