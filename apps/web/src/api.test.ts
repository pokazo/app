import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("surfaces the response body on HTTP errors", async () => {
    const body = { error: "payment_required", billing: { credits: 0 } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status: 402 })));

    await expect(api("/api/decks")).rejects.toMatchObject<ApiError>({
      status: 402,
      body,
    });
  });
});
