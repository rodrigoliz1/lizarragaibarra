import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-8 text-center">
      <Icon aria-hidden="true" className="mx-auto size-6 text-paper-quiet" />
      <h3 className="mt-5 font-serif text-2xl text-paper">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-paper-quiet">
        {description}
      </p>
    </div>
  );
}
