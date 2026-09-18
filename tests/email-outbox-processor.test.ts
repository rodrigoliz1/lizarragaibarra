import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  create: vi.fn(),
  updateMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    emailOutbox: {
      create: mocked.create,
      updateMany: mocked.updateMany,
      findFirst: mocked.findFirst,
      findUnique: mocked.findUnique,
    },
  },
}));

import {
  processEmailOutboxMessage,
  retryTrackedEmail,
  sendTrackedEmail,
} from "@/lib/email";
import { encryptEmailMessagePayload } from "@/lib/email/outbox-policy";

const environment = {
  EMAIL_OUTBOX_MAX_ATTEMPTS: "2",
  EMAIL_OUTBOX_BASE_DELAY_MS: "1000",
  EMAIL_OUTBOX_MAX_DELAY_MS: "5000",
  EMAIL_OUTBOX_LOCK_TIMEOUT_MS: "120000",
  DATA_ENCRYPTION_KEY_VERSION: "processor-test-v1",
  DATA_ENCRYPTION_KEY_CURRENT: Buffer.alloc(32, 23).toString("base64"),
};

const message = {
  to: "cliente@example.com",
  subject: "Aviso seguro",
  template: "test",
  text: "Contenido privado",
  html: "<p>Contenido privado</p>",
};

function claimedOutbox(attempts: number) {
  return {
    id: "outbox-1",
    recipient: "cliente@example.com",
    subject: message.subject,
    template: message.template,
    payload: null,
    encryptedPayload: encryptEmailMessagePayload(message, environment),
    attempts,
  };
}

describe("procesador del outbox", () => {
  beforeEach(() => {
    mocked.create.mockReset();
    mocked.updateMany.mockReset();
    mocked.findFirst.mockReset();
    mocked.findUnique.mockReset();
  });

  it("encola ciphertext con una clave idempotente antes de entregar", async () => {
    mocked.create.mockResolvedValueOnce({
      id: "outbox-1",
      status: "PENDING",
      providerId: null,
    });
    mocked.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    mocked.findFirst.mockResolvedValueOnce(claimedOutbox(1));
    const send = vi.fn().mockResolvedValue({ providerId: "mock-message-1" });

    await expect(
      sendTrackedEmail(message, {
        environment,
        idempotencyKey: "business-event-1",
        now: new Date("2026-08-05T12:00:00.000Z"),
        workerId: "worker-a",
        provider: { name: "mock", send },
      }),
    ).resolves.toMatchObject({ status: "MOCKED" });
    const create = mocked.create.mock.calls[0][0];
    expect(create.data.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
    expect(create.data.encryptedPayload).toEqual(expect.any(String));
    expect(create.data.encryptedPayload).not.toContain(message.text);
    expect(create.data.payload).toBeDefined();
  });

  it("reclama atómicamente y purga el ciphertext después de MOCKED", async () => {
    mocked.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    mocked.findFirst.mockResolvedValueOnce(claimedOutbox(1));
    const send = vi.fn().mockResolvedValue({ providerId: "mock-message-1" });

    await expect(
      processEmailOutboxMessage("outbox-1", {
        environment,
        now: new Date("2026-08-05T12:00:00.000Z"),
        workerId: "worker-a",
        provider: { name: "mock", send },
      }),
    ).resolves.toMatchObject({
      outboxId: "outbox-1",
      status: "MOCKED",
      providerId: "mock-message-1",
    });
    expect(mocked.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: "outbox-1", attempts: { lt: 2 } },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        lockedBy: "worker-a",
      },
    });
    expect(mocked.updateMany.mock.calls[1][0]).toMatchObject({
      where: {
        id: "outbox-1",
        status: "PROCESSING",
        lockedBy: "worker-a",
      },
      data: {
        status: "MOCKED",
        encryptedPayload: null,
        lockedAt: null,
        lockedBy: null,
      },
    });
    expect(send).toHaveBeenCalledOnce();
  });

  it("pasa a DEAD_LETTER al agotar intentos y libera el lease", async () => {
    mocked.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    mocked.findFirst.mockResolvedValueOnce(claimedOutbox(2));
    const send = vi.fn().mockRejectedValue(new Error("remote secret"));

    await expect(
      processEmailOutboxMessage("outbox-1", {
        environment,
        now: new Date("2026-08-05T12:00:00.000Z"),
        workerId: "worker-a",
        provider: { name: "brevo", send },
      }),
    ).resolves.toMatchObject({
      status: "DEAD_LETTER",
      error: "El proveedor brevo no pudo completar el envío.",
    });
    expect(mocked.updateMany.mock.calls[1][0]).toMatchObject({
      data: {
        status: "DEAD_LETTER",
        nextAttemptAt: null,
        lockedAt: null,
        lockedBy: null,
      },
    });
  });

  it("cifra y elimina el JSON legacy antes de llamar al proveedor", async () => {
    mocked.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    mocked.findFirst.mockResolvedValueOnce({
      ...claimedOutbox(1),
      payload: {
        to: ["cliente@example.com"],
        text: message.text,
        html: message.html,
      },
      encryptedPayload: null,
    });
    const send = vi.fn().mockResolvedValue({ providerId: "mock-legacy" });

    await expect(
      processEmailOutboxMessage("outbox-1", {
        environment,
        workerId: "worker-a",
        provider: { name: "mock", send },
      }),
    ).resolves.toMatchObject({ status: "MOCKED" });
    const promotion = mocked.updateMany.mock.calls[1][0];
    expect(promotion.data.encryptedPayload).toEqual(expect.any(String));
    expect(promotion.data.encryptedPayload).not.toContain(message.text);
    expect(promotion.data.payload).toBeDefined();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ text: message.text, html: message.html }),
    );
  });

  it("no entrega cuando otro worker ganó el claim", async () => {
    mocked.updateMany.mockResolvedValueOnce({ count: 0 });
    const send = vi.fn();

    await expect(
      processEmailOutboxMessage("outbox-1", {
        environment,
        workerId: "worker-loser",
        provider: { name: "mock", send },
      }),
    ).resolves.toEqual({ outboxId: "outbox-1", status: "SKIPPED" });
    expect(mocked.findFirst).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("el reintento administrativo solo reencola y reinicia dead letters", async () => {
    mocked.findUnique.mockResolvedValueOnce({
      status: "DEAD_LETTER",
      attempts: 2,
    });
    mocked.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(retryTrackedEmail("outbox-1", environment)).resolves.toEqual({
      outboxId: "outbox-1",
      status: "PENDING",
      resetAttempts: true,
    });
    expect(mocked.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "outbox-1", status: "DEAD_LETTER" },
        data: expect.objectContaining({
          status: "PENDING",
          attempts: 0,
          lockedAt: null,
          lockedBy: null,
        }),
      }),
    );
  });
});
