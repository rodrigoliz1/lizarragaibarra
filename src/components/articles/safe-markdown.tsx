import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
export function SafeMarkdown({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        img: ({ src, alt }) =>
          typeof src === "string" &&
          /^\/api\/(?:portal\/)?media\/[a-z0-9]+$/.test(src) ? (
            <Image
              src={src}
              alt={alt || ""}
              width={1200}
              height={800}
              unoptimized
              style={{ width: "100%", height: "auto" }}
            />
          ) : null,
        a: ({ href, children }) => (
          <a href={href} rel="noopener noreferrer">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div style={{ overflowX: "auto" }}>
            <table>{children}</table>
          </div>
        ),
      }}
    >
      {children}
    </Markdown>
  );
}
