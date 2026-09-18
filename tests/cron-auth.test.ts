import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "@/lib/security/cron";

const secret = "a-secure-cron-secret-with-32-chars";

describe("autorización de cron", () => {
  it("acepta Bearer exacto", () => {
    const request = new Request("https://xs.example/api/cron", {
      headers: { authorization: `Bearer ${secret}` },
    });
    expect(
      isAuthorizedCronRequest(request, "SYNC_SECRET", {
        SYNC_SECRET: secret,
      }),
    ).toBe(true);
  });

  it("rechaza secreto ausente o parcial", () => {
    const request = new Request("https://xs.example/api/cron", {
      headers: { authorization: "Bearer a-secure-cron-secret" },
    });
    expect(
      isAuthorizedCronRequest(request, "SYNC_SECRET", {
        SYNC_SECRET: secret,
      }),
    ).toBe(false);
    expect(isAuthorizedCronRequest(request, "SYNC_SECRET", {})).toBe(false);
  });
});
