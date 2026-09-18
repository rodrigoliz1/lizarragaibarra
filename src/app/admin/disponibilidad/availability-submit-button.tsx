"use client";

import { useFormStatus } from "react-dom";

export function AvailabilitySubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  confirmation,
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "danger";
  confirmation?: string;
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "danger"
      ? "border-red-800/15 bg-red-800/[0.05] text-red-900 hover:bg-red-800/[0.1]"
      : "border-black bg-black text-white hover:bg-[#292929]";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      onClick={(event) => {
        if (confirmation && !window.confirm(confirmation)) {
          event.preventDefault();
        }
      }}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.13em] transition disabled:cursor-wait disabled:opacity-55 ${styles}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
