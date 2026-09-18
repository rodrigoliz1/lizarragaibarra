import type { CaseStudy } from "@prisma/client";
import { SafeMarkdown } from "@/components/articles/safe-markdown";
export function CaseBody({ study }: { study: CaseStudy }) {
  return (
    <div className="case-body">
      {(["context", "challenge", "strategy", "result"] as const).map(
        (key, i) => (
          <section key={key}>
            <div>
              <span className="li-label">0{i + 1}</span>
              <h2>{["Contexto", "Reto", "Estrategia", "Resultado"][i]}</h2>
            </div>
            <div className="prose-li">
              <SafeMarkdown>{study[key]}</SafeMarkdown>
            </div>
          </section>
        ),
      )}
    </div>
  );
}
