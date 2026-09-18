import Link from "next/link";

import { AdminHeading, AdminStatus } from "@/components/admin/admin-primitives";
import { db } from "@/lib/db";

export default async function PendingArticlesPage() {
  const articles = await db.article.findMany({
    where: { status: { in: ["SUBMITTED", "CHANGES_REQUESTED", "APPROVED"] } },
    include: {
      author: { select: { name: true } },
      revisions: { orderBy: { version: "desc" }, take: 1 },
    },
    orderBy: { submittedAt: "asc" },
  });
  return (
    <div className="space-y-8">
      <AdminHeading
        eyebrow="Flujo editorial"
        title="Pendientes de aprobación"
        description="Envíos de asociados y decisiones editoriales con historial de versión."
      />
      <section className="grid gap-4 lg:grid-cols-2">
        {articles.map((article) => (
          <Link
            href={`/admin/articulos/${article.id}`}
            key={article.id}
            className="rounded-2xl border border-black/10 bg-white p-6"
          >
            <div className="flex justify-between">
              <AdminStatus
                tone={article.status === "CHANGES_REQUESTED" ? "gold" : "blue"}
              >
                {article.status}
              </AdminStatus>
              <span className="text-xs text-black/30">
                v{article.revisions[0]?.version || 0}
              </span>
            </div>
            <h2 className="mt-6 font-serif text-3xl">{article.title}</h2>
            <p className="mt-3 text-sm text-black/45">
              {article.author?.name || "Autor sin cuenta"}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
