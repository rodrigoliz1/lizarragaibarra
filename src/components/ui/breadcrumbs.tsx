import { ChevronRight } from "lucide-react";
import Link from "next/link";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Migas de pan">
      <ol className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-paper-quiet">
        <li>
          <Link
            className="transition hover:text-paper focus-visible:outline-none focus-visible:ring-2"
            href="/"
          >
            Inicio
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <ChevronRight aria-hidden="true" className="size-3" />
            {item.href ? (
              <Link
                className="transition hover:text-paper focus-visible:outline-none focus-visible:ring-2"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-paper-muted">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
