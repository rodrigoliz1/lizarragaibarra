import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  invert?: boolean;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  invert = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-4xl",
        align === "center" && "mx-auto text-center",
        invert ? "text-paper" : "text-ink",
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn("eyebrow", invert ? "text-paper-quiet" : "text-ink/55")}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-5 text-balance font-serif text-4xl leading-[0.98] tracking-[-0.035em] sm:text-5xl lg:text-7xl">
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-6 max-w-2xl text-pretty text-base leading-7 sm:text-lg",
            align === "center" && "mx-auto",
            invert ? "text-paper-muted" : "text-ink/65",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
