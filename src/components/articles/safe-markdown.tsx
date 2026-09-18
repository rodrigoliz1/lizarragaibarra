import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";

export function slugifyHeading(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function SafeMarkdown({
  children,
  headingIds = false,
}: {
  children: string;
  headingIds?: boolean;
}) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        h2: ({ children }) => (
          <h2 id={headingIds ? slugifyHeading(String(children)) : undefined}>
            {children}
          </h2>
        ),
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
