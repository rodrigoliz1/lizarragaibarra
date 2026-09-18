import { cn } from "@/lib/utils";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em]",
        tone === "neutral" &&
          "border-white/15 bg-white/[0.04] text-paper-muted",
        tone === "success" &&
          "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
        tone === "warning" &&
          "border-amber-300/25 bg-amber-300/10 text-amber-100",
        tone === "info" && "border-sky-300/25 bg-sky-300/10 text-sky-100",
      )}
    >
      {children}
    </span>
  );
}
