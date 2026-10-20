import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("./slidev-dev-pool.js", () => ({
  getSlidevDevSession: vi.fn(),
}));

import { getSlidevDevSession } from "./slidev-dev-pool.js";
import { liveDeckIdFromPath } from "./slidev-dev-proxy.js";

describe("liveDeckIdFromPath", () => {
  beforeEach(() => {
    vi.mocked(getSlidevDevSession).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns deck id when live session exists", () => {
    const id = "bed0ddd0-7520-4a71-b0e7-21d899a7143a";
    vi.mocked(getSlidevDevSession).mockReturnValue({
      deckId: id,
      workDir: "/tmp",
      port: 39111,
      child: {} as never,
      lastUsedAt: Date.now(),
      ready: true,
    });
    expect(liveDeckIdFromPath(`/p/${id}/2`)).toBe(id);
    expect(liveDeckIdFromPath(`/p/${id}/`)).toBe(id);
  });

  it("returns undefined without live session", () => {
    const id = "bed0ddd0-7520-4a71-b0e7-21d899a7143a";
    vi.mocked(getSlidevDevSession).mockReturnValue(undefined);
    expect(liveDeckIdFromPath(`/p/${id}/`)).toBeUndefined();
  });

  it("ignores non-uuid paths", () => {
    expect(liveDeckIdFromPath("/p/not-a-uuid/")).toBeUndefined();
    expect(liveDeckIdFromPath("/ws/deck/x")).toBeUndefined();
  });
});
