import { describe, expect, it, vi } from "vitest";

import { BrevoEmailProvider } from "@/lib/email/providers";

const message = {
  to: "cliente@example.com",
  subject: "Solicitud recibida",
  template: "test",
  text: "Contenido de texto",
  html: "<p>Contenido</p>",
  replyTo: "contacto@lizarragaibarra.com",
  tags: ["transactional"],
};

describe("BrevoEmailProvider", () => {
  it("envía HTML y texto mediante el SDK oficial y devuelve messageId", async () => {
    const sendTransacEmail = vi
      .fn()
      .mockResolvedValue({ messageId: "brevo-message-id" });
    const provider = new BrevoEmailProvider(
      "brevo-test-key",
      "notificaciones@lizarragaibarra.com",
      "LIZÁRRAGA & IBARRA ABOGADOS",
      {
        sandboxMode: true,
        client: { transactionalEmails: { sendTransacEmail } },
      },
    );

    await expect(provider.send(message)).resolves.toEqual({
      providerId: "brevo-message-id",
    });
    expect(sendTransacEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: {
          email: "notificaciones@lizarragaibarra.com",
          name: "LIZÁRRAGA & IBARRA ABOGADOS",
        },
        to: [{ email: "cliente@example.com" }],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
        replyTo: { email: "contacto@lizarragaibarra.com" },
        tags: ["transactional"],
        headers: { "X-Sib-Sandbox": "drop" },
      }),
      { timeoutInSeconds: 15, maxRetries: 0 },
    );
  });

  it("devuelve un error seguro sin filtrar la API key", async () => {
    const sendTransacEmail = vi.fn().mockRejectedValue({
      message: "remote failure brevo-private-value",
    });
    const provider = new BrevoEmailProvider(
      "brevo-private-value",
      "notificaciones@lizarragaibarra.com",
      "LIZÁRRAGA & IBARRA ABOGADOS",
      { client: { transactionalEmails: { sendTransacEmail } } },
    );

    const error = await provider
      .send(message)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Brevo no pudo completar el envío transaccional.",
    );
    expect((error as Error).message).not.toContain("brevo-private-value");
  });
});
