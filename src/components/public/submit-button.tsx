"use client";
import { useFormStatus } from "react-dom";
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="li-button" disabled={pending} type="submit">
      {pending ? "Procesando…" : children}
    </button>
  );
}
