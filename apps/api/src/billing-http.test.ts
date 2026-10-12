import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

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
});
