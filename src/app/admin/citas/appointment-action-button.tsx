"use client";

import { useFormStatus } from "react-dom";

type Props = {
  label: string;
  pendingLabel: string;
  variant: "primary" | "secondary" | "danger";
  confirmation?: string;
};

const styles = {
  primary: "border-black bg-black text-white hover:bg-[#292929]",
  secondary:
    "border-black/15 bg-white text-black/60 hover:border-black/30 hover:text-black",
  danger:
    "border-red-800/15 bg-red-800/[0.05] text-red-900 hover:bg-red-800/[0.09]",
} as const;

export function AppointmentActionButton({
  label,
  pendingLabel,
  variant,
  confirmation,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      onClick={(event) => {
        if (confirmation && !window.confirm(confirmation))
          event.preventDefault();
      }}
      className={`min-h-11 w-full rounded-xl border px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] transition disabled:cursor-wait disabled:opacity-55 ${styles[variant]}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
