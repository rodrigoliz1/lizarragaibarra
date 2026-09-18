import { describe, expect, it, vi } from "vitest";

import {
  createLazyForwardingProxy,
  createRequestScopedValue,
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
});
