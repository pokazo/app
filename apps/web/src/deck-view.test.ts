import { describe, expect, it } from "vitest";
import { embedDeckUrl, embedSlideUrl, slidevNavigateMessage } from "./deck-view";

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
});
