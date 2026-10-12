import { describe, expect, it } from "vitest";
import {
  embedDeckUrl,
  embedSlideUrl,
  slidevNavigateMessage,
  slidevPageForOutlineIndex,
} from "./deck-view";

describe("embed urls", () => {
  it("keeps one deck URL without a slide index", () => {
    expect(embedDeckUrl("https://api.pokazo.ru/p/abc/")).toBe("https://api.pokazo.ru/p/abc/?embedded");
    expect(embedDeckUrl("https://api.pokazo.ru/p/abc")).toBe("https://api.pokazo.ru/p/abc/?embedded");
  });

  it("uses Slidev path index with embedded flag", () => {
    expect(embedSlideUrl("https://api.pokazo.ru/p/abc/", 3)).toBe("https://api.pokazo.ru/p/abc/3?embedded");
    expect(embedSlideUrl("https://api.pokazo.ru/p/abc", 1)).toBe("https://api.pokazo.ru/p/abc/1?embedded");
  });

  it("matches Slidev embed navigate payload", () => {
    expect(slidevNavigateMessage(4)).toEqual({
      target: "slidev",
      type: "navigate",
      no: 4,
      clicks: 0,
    });
  });

  it("resolves Slidev page from outline index when orphan hero shifts pages", () => {
    const slides = [
      { index: 1, slidevIndex: 2 },
      { index: 2, slidevIndex: 3 },
      { index: 3, slidevIndex: 4 },
    ];
    expect(slidevPageForOutlineIndex(slides, 3)).toBe(4);
    expect(slidevPageForOutlineIndex(slides, 1)).toBe(2);
    expect(slidevPageForOutlineIndex([{ index: 1 }], 1)).toBe(1);
  });
});
