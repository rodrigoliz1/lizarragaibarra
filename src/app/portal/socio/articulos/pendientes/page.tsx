import Link from "next/link";

import {
  SectionHeading,
  StatusPill,
} from "@/components/portal/portal-primitives";
import { db } from "@/lib/db";
import { requirePartner } from "@/server/policies";

export default async function PartnerPendingArticlesPage() {
  await requirePartner();
  const articles = await db.article.findMany({
    where: { status: "SUBMITTED" },
    include: {
      author: { select: { name: true } },
      revisions: { orderBy: { version: "desc" }, take: 1 },
    },
    orderBy: { submittedAt: "asc" },
  });
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Responsabilidad editorial"
        title="Pendientes de aprobación"
        description="Artículos enviados por asociados para revisión, comentarios y decisión."
      />
      <section className="grid gap-4 lg:grid-cols-2">
        {articles.map((article) => (
          <Link
            href={`/portal/socio/articulos/${article.id}/revision`}
            key={article.id}
            className="rounded-2xl border border-white/10 p-6"
          >
            <div className="flex justify-between">
              <StatusPill tone="gold">Pendiente</StatusPill>
              <span className="text-xs text-white/30">
                v{article.revisions[0]?.version || 0}
              </span>
            </div>
            <h2 className="mt-6 font-serif text-3xl">{article.title}</h2>
            <p className="mt-3 text-sm text-white/45">{article.author?.name}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
