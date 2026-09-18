import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/policies";
import { CaseBody } from "@/components/public/case-body";
export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const study = await db.caseStudy.findUnique({ where: { id } });
  if (!study) notFound();
  return (
    <div className="li-public" style={{ padding: 30 }}>
      <p className="editor-notice">Vista previa privada · {study.status}</p>
      <h1 style={{ fontSize: 60, marginBlock: 25 }}>{study.title}</h1>
      <p>{study.summary}</p>
      <CaseBody study={study} />
    </div>
  );
}
