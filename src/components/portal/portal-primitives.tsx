import type { LucideIcon } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d3d3d0]">
          {eyebrow}
        </p>
        <h1 className="font-serif text-4xl font-medium tracking-[-0.025em] text-white sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "gold" | "blue";
}) {
  const tones = {
    neutral: "border-white/15 bg-white/[0.06] text-white/65",
    green: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    gold: "border-[#d3d3d0]/30 bg-[#d3d3d0]/10 text-[#d3d3d0]",
    blue: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.055]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d3d3d0]/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
          {label}
        </p>
        <span className="grid size-9 place-items-center rounded-full border border-white/10 bg-black/25 text-[#d3d3d0]">
          <Icon aria-hidden="true" size={16} strokeWidth={1.6} />
        </span>
      </div>
      <p className="mt-6 font-serif text-4xl text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-white/45">{note}</p>
    </article>
  );
}
