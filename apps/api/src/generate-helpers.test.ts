import { describe, expect, it } from "vitest";
import { composeMaxSteps, mergeComposeTools, pickHeroTools } from "./generate-helpers.js";

describe("composeMaxSteps", () => {
  it("scales with slide count and caps", () => {
    expect(composeMaxSteps(6)).toBeGreaterThanOrEqual(30);
    expect(composeMaxSteps(16)).toBeLessThanOrEqual(72);
  });
});

describe("mergeComposeTools", () => {
  it("merges slidev, yandex, stock, and image-gen tool maps", () => {
    const merged = mergeComposeTools(
      { "slidev-list-slides": { a: 1 } },
      { "yandex-image-search": { y: 1 }, "yandex-image-download": { z: 2 } },
      { "stock-search": { b: 2 }, "stock-download": { c: 3 } },
      { "image-generate": { d: 4 } },
    );
    expect(Object.keys(merged).sort()).toEqual([
      "image-generate",
      "slidev-list-slides",
      "stock-download",
      "stock-search",
      "yandex-image-download",
      "yandex-image-search",
    ]);
  });
});

describe("pickHeroTools", () => {
  it("keeps update + assets and drops insert/remove/move", () => {
    const picked = pickHeroTools({
      "slidev-update-slide": 1,
      "slidev-insert-slide": 2,
      "slidev-remove-slide": 3,
      "slidev-move-slide": 4,
      "slidev-list-slides": 5,
      "yandex-image-search": 8,
      "stock-search": 6,
      "image-generate": 7,
    });
    expect(Object.keys(picked).sort()).toEqual([
      "image-generate",
      "slidev-list-slides",
      "slidev-update-slide",
      "stock-search",
      "yandex-image-search",
    ]);
  });
});
