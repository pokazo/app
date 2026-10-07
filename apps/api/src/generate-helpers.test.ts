import { describe, expect, it } from "vitest";
import { composeMaxSteps, mergeComposeTools } from "./generate-helpers.js";

describe("composeMaxSteps", () => {
  it("scales with slide count and caps", () => {
    expect(composeMaxSteps(6)).toBeGreaterThanOrEqual(30);
    expect(composeMaxSteps(16)).toBeLessThanOrEqual(72);
  });
});

describe("mergeComposeTools", () => {
  it("merges slidev, stock, and image-gen tool maps", () => {
    const merged = mergeComposeTools(
      { "slidev-list-slides": { a: 1 } },
      { "stock-search": { b: 2 }, "stock-download": { c: 3 } },
      { "image-generate": { d: 4 } },
    );
    expect(Object.keys(merged).sort()).toEqual([
      "image-generate",
      "slidev-list-slides",
      "stock-download",
      "stock-search",
    ]);
  });
});
