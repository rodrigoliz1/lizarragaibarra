import { describe, expect, it } from "vitest";

import {
  buildEmailIdempotencyKey,
  emailFailureDisposition,
  emailMessageFromOutboxRecord,
  emailRetryDelayMs,
  encryptEmailMessagePayload,
  getEmailOutboxPolicy,
} from "@/lib/email/outbox-policy";
import { isAuthorizedCronRequest } from "@/lib/security/cron";

const encryptionEnvironment = {
  DATA_ENCRYPTION_KEY_VERSION: "email-test-v1",
  DATA_ENCRYPTION_KEY_CURRENT: Buffer.alloc(32, 17).toString("base64"),
};

const message = {
  to: "cliente@example.com",
  subject: "Restablece tu acceso",
  template: "password-reset",
  text: "Token secreto reset-token-123",
  html: '<a href="https://example.com/reset?token=reset-token-123">Abrir</a>',
  replyTo: "contacto@lizarragaibarra.com",
  tags: ["security"],
  metadata: { "X-LI-Reference": "RESET-1" },
};

describe("política del outbox transaccional", () => {
  it("cifra el cuerpo y recupera el mensaje sin persistir el token en claro", () => {
    const encryptedPayload = encryptEmailMessagePayload(
      message,
      encryptionEnvironment,
    );
    expect(encryptedPayload).not.toContain("reset-token-123");
    expect(encryptedPayload).not.toContain(message.text);
    expect(encryptedPayload).not.toContain(message.html);
    expect(
      emailMessageFromOutboxRecord(
        {
          recipient: "cliente@example.com",
          subject: message.subject,
          template: message.template,
          payload: null,
          encryptedPayload,
        },
        encryptionEnvironment,
      ),
    ).toEqual({ ...message, to: ["cliente@example.com"] });
  });

  it("mantiene lectura legacy, pero no degrada a texto plano si hay ciphertext", () => {
    const legacyPayload = {
      to: ["legacy@example.com"],
      text: "Texto anterior",
      html: "<p>Anterior</p>",
    };
    expect(
      emailMessageFromOutboxRecord({
        recipient: "legacy@example.com",
        subject: "Legacy",
        template: "legacy",
        payload: legacyPayload,
        encryptedPayload: null,
      }),
    ).toMatchObject({ to: ["legacy@example.com"], text: "Texto anterior" });
    expect(() =>
      emailMessageFromOutboxRecord(
        {
          recipient: "legacy@example.com",
          subject: "Legacy",
          template: "legacy",
          payload: legacyPayload,
          encryptedPayload: "ciphertext-inválido",
        },
        encryptionEnvironment,
      ),
    ).toThrow(/Envelope cifrado/);
  });

  it("deriva claves de idempotencia determinísticas y contextualizadas", () => {
    const first = buildEmailIdempotencyKey(message, "reset:user-1:token-1");
    const repeated = buildEmailIdempotencyKey(message, "reset:user-1:token-1");
    const anotherRecipient = buildEmailIdempotencyKey(
      { ...message, to: "otro@example.com" },
      "reset:user-1:token-1",
    );
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(repeated).toBe(first);
    expect(anotherRecipient).not.toBe(first);
    expect(buildEmailIdempotencyKey(message)).toBeNull();
    expect(() => buildEmailIdempotencyKey(message, "clave\ninválida")).toThrow(
      /idempotencia/,
    );
  });

  it("aplica backoff exponencial y termina en dead letter", () => {
    const policy = getEmailOutboxPolicy({
      EMAIL_OUTBOX_MAX_ATTEMPTS: "3",
      EMAIL_OUTBOX_BASE_DELAY_MS: "1000",
      EMAIL_OUTBOX_MAX_DELAY_MS: "2500",
    });
    expect(emailRetryDelayMs(1, policy)).toBe(1000);
    expect(emailRetryDelayMs(2, policy)).toBe(2000);
    expect(emailRetryDelayMs(3, policy)).toBe(2500);
    const now = new Date("2026-08-05T12:00:00.000Z");
    expect(emailFailureDisposition(now, 2, policy)).toEqual({
      status: "FAILED",
      nextAttemptAt: new Date("2026-08-05T12:00:02.000Z"),
    });
    expect(emailFailureDisposition(now, 3, policy)).toEqual({
      status: "DEAD_LETTER",
      nextAttemptAt: null,
    });
  });

  it("protege el cron con EMAIL_CRON_SECRET", () => {
    const secret = "email-cron-secret-with-at-least-24-characters";
    const environment = { EMAIL_CRON_SECRET: secret };
    expect(
      isAuthorizedCronRequest(
        new Request("https://lizarragaibarra.com/api/cron/email-outbox", {
          headers: { authorization: `Bearer ${secret}` },
        }),
        "EMAIL_CRON_SECRET",
        environment,
      ),
    ).toBe(true);
    expect(
      isAuthorizedCronRequest(
        new Request("https://lizarragaibarra.com/api/cron/email-outbox", {
          headers: { authorization: "Bearer incorrecto" },
        }),
        "EMAIL_CRON_SECRET",
        environment,
      ),
    ).toBe(false);
  });
});
