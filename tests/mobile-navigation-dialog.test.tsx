import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useMobileNavigationDialog } from "@/components/layout/use-mobile-navigation-dialog";

function TestDialog() {
  const [open, setOpen] = useState(false);
  const { dialogRef, triggerRef } = useMobileNavigationDialog(open, setOpen);

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(true)}>
        Abrir
      </button>
      {open ? (
        <aside ref={dialogRef} role="dialog" aria-modal="true">
          <button>Primero</button>
          <a href="/destino">Último</a>
        </aside>
      ) : null}
    </>
  );
}

describe("mobile navigation dialog", () => {
  it("contains keyboard focus and restores it when closed", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);

    const trigger = screen.getByRole("button", { name: "Abrir" });
    await user.click(trigger);
    expect(document.body.style.overflow).toBe("hidden");

    const first = await screen.findByRole("button", { name: "Primero" });
    const last = screen.getByRole("link", { name: "Último" });
    await waitFor(() => expect(first).toHaveFocus());

    last.focus();
    await user.tab();
    expect(first).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
  });
});
