import { describe, expect, it } from "vitest";
import { isDeckId, shouldPollDeckView } from "./deck-view-poll.js";

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
});
