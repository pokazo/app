import { describe, expect, it } from "vitest";
import {
  embedDebugQuery,
  embedDeckUrl,
  embedSlideUrl,
  slidevNavigateMessage,
  slidevPageForOutlineIndex,
  stageNavShouldPost,
} from "./deck-view";

describe("embed urls", () => {
  it("keeps one deck URL without a slide index", () => {
    expect(embedDebugQuery()).toBe("");
    expect(embedDeckUrl("https://api.pokazo.ru/p/abc/")).toBe(
      "https://api.pokazo.ru/p/abc/?embedded&pkStatic=1",
    );
    expect(embedDeckUrl("https://api.pokazo.ru/p/abc")).toBe(
      "https://api.pokazo.ru/p/abc/?embedded&pkStatic=1",
    );
  });

  it("uses Slidev path index with embedded flag", () => {
    expect(embedSlideUrl("https://api.pokazo.ru/p/abc/", 3)).toBe(
      "https://api.pokazo.ru/p/abc/3?embedded&pkStatic=1",
    );
    expect(embedSlideUrl("https://api.pokazo.ru/p/abc", 1)).toBe(
      "https://api.pokazo.ru/p/abc/1?embedded&pkStatic=1",
    );
  });

  it("reposts navigate after the player iframe reloads on the same page", () => {
    expect(
      stageNavShouldPost({ lastPosted: 3, page: 3, postedLoad: 1, stageLoad: 1 }),
    ).toBe(false);
    expect(
      stageNavShouldPost({ lastPosted: 3, page: 3, postedLoad: 1, stageLoad: 2 }),
    ).toBe(true);
    expect(
      stageNavShouldPost({ lastPosted: 1, page: 3, postedLoad: 2, stageLoad: 2 }),
    ).toBe(true);
  });

  it("matches Slidev embed navigate payload", () => {
    expect(slidevNavigateMessage(4)).toEqual({
      target: "slidev",
      type: "navigate",
      no: 4,
      clicks: 0,
    });
  });

  it("resolves Slidev page from view index when orphan hero is slide 1", () => {
    const slides = [
      { index: 1, slidevIndex: 1 },
      { index: 2, slidevIndex: 2 },
      { index: 3, slidevIndex: 3 },
      { index: 4, slidevIndex: 4 },
    ];
    expect(slidevPageForOutlineIndex(slides, 1)).toBe(1);
    expect(slidevPageForOutlineIndex(slides, 4)).toBe(4);
    expect(slidevPageForOutlineIndex([{ index: 1 }], 1)).toBe(1);
  });
});
