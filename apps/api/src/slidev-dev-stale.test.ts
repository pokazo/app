import { describe, expect, it } from "vitest";
import { markdownNewerThanDist } from "./slidev-dev-pool.js";

describe("markdownNewerThanDist", () => {
  it("is true after a live move writes slides.md and skips slidev build", () => {
    expect(markdownNewerThanDist(200, 100)).toBe(true);
    expect(markdownNewerThanDist(200, null)).toBe(true);
    expect(markdownNewerThanDist(100, 200)).toBe(false);
    expect(markdownNewerThanDist(100, 100)).toBe(false);
    expect(markdownNewerThanDist(0, null)).toBe(false);
  });
});
