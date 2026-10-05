import { describe, expect, it } from "vitest";
import { embedSlideUrl } from "./deck-view";

describe("embedSlideUrl", () => {
  it("uses Slidev path index", () => {
    expect(embedSlideUrl("https://api.pokazo.ru/p/abc/", 3)).toBe("https://api.pokazo.ru/p/abc/3");
    expect(embedSlideUrl("https://api.pokazo.ru/p/abc", 1)).toBe("https://api.pokazo.ru/p/abc/1");
  });
});
