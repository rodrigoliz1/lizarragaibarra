export type EmailMessage = {
  to: string | string[];
  subject: string;
  template: string;
  text: string;
  html: string;
  replyTo?: string;
  tags?: string[];
  metadata?: Record<string, string>;
};

export interface EmailProvider {
  readonly name: "mock" | "brevo" | "resend";
  send(message: EmailMessage): Promise<{ providerId: string }>;
}
