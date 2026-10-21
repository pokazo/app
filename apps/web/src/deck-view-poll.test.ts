import { describe, expect, it } from "vitest";
import {
  isDeckId,
  deckEditBlocksUi,
  progressiveSlideReveal,
  shouldClearRewriteBusy,
  shouldPollDeckView,
} from "./deck-view-poll.js";

describe("isDeckId", () => {
  it("accepts uuid", () => {
    expect(isDeckId("647ba782-ccc3-461c-aae5-d5fa0bd6468a")).toBe(true);
  });

  it("rejects junk", () => {
    expect(isDeckId("")).toBe(false);
    expect(isDeckId("not-a-uuid")).toBe(false);
  });
});

describe("deckEditBlocksUi", () => {
  it("does not lock the filmstrip for a live structure edit", () => {
    expect(
      deckEditBlocksUi({
        serverBuilding: true,
        livePreview: true,
        editKind: "structure",
      }),
    ).toBe(false);
  });

  it("still locks while a slide rewrite or a static structure build runs", () => {
    expect(
      deckEditBlocksUi({ serverBuilding: true, livePreview: true, editKind: "rewrite" }),
    ).toBe(true);
    expect(
      deckEditBlocksUi({ serverBuilding: true, livePreview: false, editKind: "structure" }),
    ).toBe(true);
    expect(deckEditBlocksUi({ serverBuilding: false, livePreview: true, editKind: "structure" })).toBe(
      false,
    );
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

  it("keeps polling while local rewriteBusy even if server already idle", () => {
    expect(shouldPollDeckView({ hasMeta: true, building: false, rewriteBusy: true })).toBe(true);
  });
});

describe("shouldClearRewriteBusy", () => {
  it("clears when local busy but server finished rewrite after we saw building", () => {
    expect(
      shouldClearRewriteBusy({
        rewriteBusy: true,
        serverBuilding: false,
        rewritingSlide: null,
        seenServerBuilding: true,
      }),
    ).toBe(true);
  });

  it("keeps busy while server still rewriting", () => {
    expect(
      shouldClearRewriteBusy({
        rewriteBusy: true,
        serverBuilding: true,
        rewritingSlide: 2,
        seenServerBuilding: true,
      }),
    ).toBe(false);
  });

  it("keeps busy after POST until /api/view reports building (race guard)", () => {
    // Client sets rewriteBusy before the server writes rewrite.json; an early
    // poll must not treat idle meta as "rewrite done" or the form re-enables
    // and a second click gets 409 busy.
    expect(
      shouldClearRewriteBusy({
        rewriteBusy: true,
        serverBuilding: false,
        rewritingSlide: null,
        seenServerBuilding: false,
      }),
    ).toBe(false);
  });

  it("clears when a poll started after accept already sees idle (missed the running window)", () => {
    expect(
      shouldClearRewriteBusy({
        rewriteBusy: true,
        serverBuilding: false,
        rewritingSlide: null,
        seenServerBuilding: false,
        pollAfterAccept: true,
      }),
    ).toBe(true);
  });

  it("keeps busy when the post-accept poll still sees the server building", () => {
    expect(
      shouldClearRewriteBusy({
        rewriteBusy: true,
        serverBuilding: true,
        rewritingSlide: 2,
        seenServerBuilding: false,
        pollAfterAccept: true,
      }),
    ).toBe(false);
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
