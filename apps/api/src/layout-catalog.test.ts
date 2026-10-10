import { describe, expect, it } from "vitest";
import { LAYOUT_SHOT_ORDER } from "./layout-fixtures.js";
import { LAYOUT_CATALOG, layoutGet, layoutList, layoutMatch } from "./layout-catalog.js";

describe("layout catalog", () => {
  it("covers every screenshot layout id", () => {
    const ids = new Set(LAYOUT_CATALOG.map((e) => e.id));
    for (const name of LAYOUT_SHOT_ORDER) {
      expect(ids.has(name), `missing catalog entry for ${name}`).toBe(true);
    }
  });

  it("layout-list filters by tag", () => {
    const photo = layoutList("photo");
    expect(photo.every((r) => r.tags.includes("photo"))).toBe(true);
    expect(photo.some((r) => r.id === "image-right")).toBe(true);
  });

  it("layout-get returns full entry", () => {
    expect(layoutGet("features").outlineFields).toMatch(/iconHint/);
  });

  it("layout-get throws on unknown", () => {
    expect(() => layoutGet("nope")).toThrow(/Unknown layout/);
  });

  it("layout-match prefers process for pipeline intent", () => {
    const hits = layoutMatch({ intent: "how we deliver pipeline", hasSteps: true });
    expect(hits[0]?.id).toBe("process");
  });

  it("layout-match prefers features for three pillars", () => {
    const hits = layoutMatch({ intent: "three pillars benefits", featureCount: 3 });
    expect(hits[0]?.id).toBe("features");
  });
});
