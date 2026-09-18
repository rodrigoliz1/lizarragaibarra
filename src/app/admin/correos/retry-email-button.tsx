"use client";

export function RetryEmailButton({
  action,
  outboxId,
}: {
  action: (formData: FormData) => Promise<void>;
  outboxId: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("¿Reencolar este correo transaccional?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="outboxId" type="hidden" value={outboxId} />
      <button
        className="rounded-full border border-black/15 bg-white px-4 py-2 text-[9px] font-bold uppercase tracking-[0.13em] text-black/60 transition hover:border-black/30 hover:text-black"
        type="submit"
      >
        Reencolar
      </button>
    </form>
  );
}
