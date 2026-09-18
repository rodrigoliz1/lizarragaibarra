import Link from "next/link";

import { SafeMarkdown, slugifyHeading } from "@/components/articles/safe-markdown";

export function LegalDocument({
  title,
  content,
  headings,
  updated,
}: {
  title: string;
  content: string;
  headings: string[];
  updated: string;
}) {
  return (
    <article className="legal-document">
      <header className="legal-document-header li-container">
        <p>Documentación jurídica</p>
        <h1>{title}</h1>
        <div>
          <span>Lizárraga &amp; Ibarra Abogados</span>
          <span>Última actualización: {updated}</span>
        </div>
      </header>
      <div className="legal-document-layout li-container">
        <aside className="legal-document-index">
          <strong>Contenido</strong>
          <nav aria-label={`Índice de ${title}`}>
            {headings.map((heading) => (
              <a href={`#${slugifyHeading(heading)}`} key={heading}>
                {heading}
              </a>
            ))}
          </nav>
          <Link href="/contacto">Contacto</Link>
        </aside>
        <div className="prose-li legal-document-copy">
          <SafeMarkdown headingIds>{content}</SafeMarkdown>
        </div>
      </div>
    </article>
  );
}
