import { describe, expect, it, vi } from "vitest";

import {
  createLazyForwardingProxy,
  createRequestScopedValue,
  disconnectRequestDatabaseClient,
  getRequestDatabaseClient,
} from "@/lib/db/request-lifecycle";

describe("Cloudflare request-scoped database lifecycle", () => {
  it("reuses a client only inside the same request context", () => {
    const createClient = vi.fn(() => ({ id: crypto.randomUUID() }));
    const getClient = createRequestScopedValue(createClient);
    const firstRequest = {};
    const secondRequest = {};

    const firstClient = getClient(firstRequest);

    expect(getClient(firstRequest)).toBe(firstClient);
    expect(getClient(secondRequest)).not.toBe(firstClient);
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it("resolves the active request for every database access", () => {
    type Client = { requestId: string; readRequestId(): string };

    const getClient = createRequestScopedValue<Client>(() => {
      const requestId = crypto.randomUUID();
      return {
        requestId,
        readRequestId() {
          return this.requestId;
        },
      };
    });
    const firstRequest = {};
    const secondRequest = {};
    let activeRequest = firstRequest;
    const db = createLazyForwardingProxy(() => getClient(activeRequest));

    const firstId = db.readRequestId();
    expect(db.readRequestId()).toBe(firstId);

    activeRequest = secondRequest;
    expect(db.readRequestId()).not.toBe(firstId);
  });

  it("disconnects and releases the client when a Worker request finishes", async () => {
    const disconnect = vi.fn(async () => undefined);
    const createClient = vi.fn(() => ({ $disconnect: disconnect }));
    const request = {};

    const firstClient = getRequestDatabaseClient(request, createClient);
    expect(getRequestDatabaseClient(request, createClient)).toBe(firstClient);

    await disconnectRequestDatabaseClient(request);
    expect(disconnect).toHaveBeenCalledOnce();

    expect(getRequestDatabaseClient(request, createClient)).not.toBe(
      firstClient,
    );
    expect(createClient).toHaveBeenCalledTimes(2);
  });
});
