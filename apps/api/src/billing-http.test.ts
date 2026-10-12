import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { config } from "./env.js";

describe("billing http", () => {
  it("billing/me requires auth", async () => {
    const app = createApp();
    const res = await app.request("/api/billing/me");
    expect([401, 503]).toContain(res.status);
  });

  it("checkout requires auth", async () => {
    const app = createApp();
    const res = await app.request("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ product: "credit_1" }),
    });
    expect([401, 503]).toContain(res.status);
  });

  it("webhook accepts JSON APPROVED without crashing", async () => {
    const app = createApp();
    const res = await app.request("/api/payments/tochka/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operationId: "missing", status: "APPROVED" }),
    });
    expect(res.status).toBe(200);
  });

  it("rejects unsigned JSON webhook when Tochka is configured", async () => {
    const previousToken = config.tochkaAccessToken;
    const previousFreeUnlock = config.billingFreeUnlock;
    config.tochkaAccessToken = "production-token";
    config.billingFreeUnlock = false;
    try {
      const app = createApp();
      const res = await app.request("/api/payments/tochka/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operationId: "op-1", status: "APPROVED" }),
      });
      expect(res.status).toBe(400);
    } finally {
      config.tochkaAccessToken = previousToken;
      config.billingFreeUnlock = previousFreeUnlock;
    }
  });
});
