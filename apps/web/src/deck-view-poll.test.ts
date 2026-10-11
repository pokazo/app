import { describe, expect, it } from "vitest";
import { isDeckId, progressiveSlideReveal, shouldPollDeckView } from "./deck-view-poll.js";

describe("isDeckId", () => {
  it("accepts uuid", () => {
    expect(isDeckId("647ba782-ccc3-461c-aae5-d5fa0bd6468a")).toBe(true);
  });

  it("rejects junk", () => {
    expect(isDeckId("")).toBe(false);
    expect(isDeckId("not-a-uuid")).toBe(false);
  });
});

describe("shouldPollDeckView", () => {
  it("polls before first meta (waiting for preview dist)", () => {
    expect(shouldPollDeckView({ hasMeta: false, building: false })).toBe(true);
  });

  it("polls while progressive building", () => {
    expect(shouldPollDeckView({ hasMeta: true, building: true })).toBe(true);
  });

  it("stops when ready with meta", () => {
    expect(shouldPollDeckView({ hasMeta: true, building: false })).toBe(false);
  });

  it("keeps polling when forcePoll after rewrite POST", () => {
    expect(shouldPollDeckView({ hasMeta: true, building: false, forcePoll: true })).toBe(true);
  });
});

describe("progressiveSlideReveal", () => {
  it("remounts and focuses newest slide when list grows while building", () => {
    expect(
      progressiveSlideReveal({ prevCount: 1, nextCount: 2, building: true }),
    ).toEqual({ remount: true, focusSlide: 2 });
    expect(
      progressiveSlideReveal({ prevCount: 2, nextCount: 4, building: true }),
    ).toEqual({ remount: true, focusSlide: 4 });
  });

  it("does nothing when count is stable or build finished", () => {
    expect(
      progressiveSlideReveal({ prevCount: 2, nextCount: 2, building: true }),
    ).toEqual({ remount: false, focusSlide: null });
    expect(
      progressiveSlideReveal({ prevCount: 1, nextCount: 8, building: false }),
    ).toEqual({ remount: false, focusSlide: null });
  });
});
