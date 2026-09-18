import { BrevoClient } from "@getbrevo/brevo";
import { Resend } from "resend";

import type { EmailMessage, EmailProvider } from "@/lib/email/types";

export class MockEmailProvider implements EmailProvider {
  readonly name = "mock" as const;

  async send() {
    return { providerId: `mock-${crypto.randomUUID()}` };
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend" as const;
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.resend = new Resend(apiKey);
  }

  async send(message: EmailMessage) {
    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: message.replyTo,
        tags: message.tags?.map((name) => ({ name, value: "transactional" })),
        headers: message.metadata,
      });
      if (result.error || !result.data?.id) {
        throw new Error("Resend no confirmó el envío.");
      }
      return { providerId: result.data.id };
    } catch {
      throw new Error("Resend no pudo completar el envío transaccional.");
    }
  }
}

type BrevoTransactionalClient = {
  transactionalEmails: {
    sendTransacEmail: (
      request: Parameters<
        BrevoClient["transactionalEmails"]["sendTransacEmail"]
      >[0],
      options?: Parameters<
        BrevoClient["transactionalEmails"]["sendTransacEmail"]
      >[1],
    ) => Promise<{ messageId?: string; messageIds?: string[] }>;
  };
};

type BrevoProviderOptions = {
  replyTo?: string;
  sandboxMode?: boolean;
  client?: BrevoTransactionalClient;
};

export class BrevoEmailProvider implements EmailProvider {
  readonly name = "brevo" as const;
  private readonly brevo: BrevoTransactionalClient;

  constructor(
    apiKey: string,
    private readonly fromAddress: string,
    private readonly fromName: string,
    private readonly options: BrevoProviderOptions = {},
  ) {
    this.brevo =
      options.client ??
      new BrevoClient({
        apiKey,
        timeoutInSeconds: 15,
        maxRetries: 0,
      });
  }

  async send(message: EmailMessage) {
    try {
      const response = await this.brevo.transactionalEmails.sendTransacEmail(
        {
          sender: { email: this.fromAddress, name: this.fromName },
          to: (Array.isArray(message.to) ? message.to : [message.to]).map(
            (email) => ({ email }),
          ),
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html,
          replyTo: message.replyTo
            ? { email: message.replyTo }
            : this.options.replyTo
              ? { email: this.options.replyTo }
              : undefined,
          tags: message.tags,
          headers: {
            ...message.metadata,
            ...(this.options.sandboxMode ? { "X-Sib-Sandbox": "drop" } : {}),
          },
        },
        { timeoutInSeconds: 15, maxRetries: 0 },
      );
      const providerId = response.messageId ?? response.messageIds?.[0];
      if (!providerId) {
        throw new Error("Brevo no confirmó el identificador del mensaje.");
      }
      return { providerId };
    } catch {
      throw new Error("Brevo no pudo completar el envío transaccional.");
    }
  }
}
