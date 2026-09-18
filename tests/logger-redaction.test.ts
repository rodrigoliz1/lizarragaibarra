import { describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/observability/logger";

describe("logger estructurado", () => {
  it("redacta secretos de manera recursiva", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logger.info("security.test", {
      requestId: "request-123456",
      authorization: "Bearer secret",
      nested: { apiKey: "secret", safe: "visible" },
    });
    const record = String(spy.mock.calls[0]?.[0]);
    expect(record).not.toContain("Bearer secret");
    expect(record).not.toContain('"apiKey":"secret"');
    expect(record).toContain("[REDACTED]");
    expect(record).toContain("visible");
    spy.mockRestore();
  });
});
