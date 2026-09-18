import type { LucideIcon } from "lucide-react";

export function AdminHeading({
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
    <div className="flex flex-col gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#8b8b87]">
          {eyebrow}
        </p>
        <h1 className="font-serif text-4xl font-medium tracking-[-0.03em] text-[#111] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-black/50">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminMetric({
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
    <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_40px_rgba(20,20,20,0.035)]">
      <div className="flex items-start justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
          {label}
        </p>
        <span className="grid size-9 place-items-center rounded-full bg-[#eeeae2] text-[#292929]">
          <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 font-serif text-4xl text-[#111]">{value}</p>
      <p className="mt-2 text-xs text-black/40">{note}</p>
    </article>
  );
}

export function AdminStatus({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "gold" | "blue";
}) {
  const tones = {
    neutral: "border-black/10 bg-black/[0.04] text-black/55",
    green: "border-emerald-700/15 bg-emerald-700/[0.07] text-emerald-800",
    gold: "border-[#8b8b87]/20 bg-[#8b8b87]/[0.08] text-[#292929]",
    blue: "border-sky-700/15 bg-sky-700/[0.07] text-sky-800",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
