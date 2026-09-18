import type { ArticleBlock } from "@prisma/client";
import { SafeMarkdown } from "@/components/articles/safe-markdown";
import Image from "next/image";
export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <>
      {blocks.map((b) => {
        const c = b.content as {
          text?: string;
          items?: string[];
          href?: string;
          mediaId?: string;
        };
        const text = c.text || "";
        if (b.type === "HEADING_2") return <h2 key={b.id}>{text}</h2>;
        if (b.type === "HEADING_3") return <h3 key={b.id}>{text}</h3>;
        if (b.type === "DIVIDER") return <hr key={b.id} />;
        if (b.type === "IMAGE" && c.mediaId)
          return (
            <Image
              key={b.id}
              src={"/api/media/" + c.mediaId}
              width={1200}
              height={800}
              alt={text}
              unoptimized
              style={{ width: "100%", height: "auto" }}
            />
          );
        if (b.type === "LIST")
          return (
            <ul key={b.id}>
              {(c.items || text.split("\n")).filter(Boolean).map((i, n) => (
                <li key={n}>
                  <SafeMarkdown>{i}</SafeMarkdown>
                </li>
              ))}
            </ul>
          );
        if (b.type === "QUOTE")
          return (
            <blockquote key={b.id}>
              <SafeMarkdown>{text}</SafeMarkdown>
            </blockquote>
          );
        if (b.type === "LINK" && c.href)
          return (
            <p key={b.id}>
              <a href={/^https?:\/\//.test(c.href) ? c.href : undefined}>
                {text}
              </a>
            </p>
          );
        return (
          <div key={b.id}>
            <SafeMarkdown>{text}</SafeMarkdown>
          </div>
        );
      })}
    </>
  );
}
