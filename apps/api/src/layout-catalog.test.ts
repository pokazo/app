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

  it("layout-get returns full entry with Carbon iconHints allowlist", () => {
    const features = layoutGet("features");
    expect(features.outlineFields).toMatch(/iconHint/);
    expect(features.iconHints?.length).toBeGreaterThan(20);
    expect(features.iconHints).toContain("carbon-money");
    expect(features.iconHints).toContain("carbon-user-multiple");
    expect(features.iconHints).not.toContain("carbon-people");
    expect(layoutGet("process").iconHints).toEqual(features.iconHints);
    expect(layoutGet("icon").iconHints).toEqual(features.iconHints);
    expect(features.outlineFields).toMatch(/carbon-money/);
  });

  it("every layout-get entry exposes fields[] with soft limits where copy can clip", () => {
    for (const entry of LAYOUT_CATALOG) {
      expect(entry.fields?.length, `${entry.id} missing fields`).toBeGreaterThan(0);
    }
    const imageRight = layoutGet("image-right");
    const byName = Object.fromEntries(imageRight.fields.map((f) => [f.name, f]));
    expect(byName.kicker?.limit).toMatch(/2–5 short words/i);
    expect(byName.kicker?.limit).toMatch(/≤28/);
    expect(byName.H1?.limit).toMatch(/2–8 words/);
    expect(byName.bullets?.limit).toMatch(/≤3/);
    expect(layoutGet("image-left").fields.find((f) => f.name === "bullets")?.limit).toMatch(
      /≤3/,
    );
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

  it("layout-get spotlight exposes char caps for compose", () => {
    const spot = layoutGet("spotlight");
    expect(spot.summary).toMatch(/Center photo/i);
    expect(spot.fields.some((f) => f.name === "palette" && f.required)).toBe(true);
    expect(spot.fields.find((f) => f.name === "H1")?.limit).toMatch(/≤42/);
    expect(spot.fields.find((f) => f.name === "description")?.limit).toMatch(/≤90/);
    expect(spot.fields.find((f) => f.name === "items")?.limit).toMatch(/exactly 4/);
    expect(spot.fields.find((f) => f.name === "items[].title")?.limit).toMatch(/≤18/);
    expect(spot.fields.find((f) => f.name === "items[].body")?.limit).toMatch(/≤48/);
  });

  it("layout-match prefers spotlight for product photo + 4 features", () => {
    const hits = layoutMatch({
      intent: "product showcase spotlight",
      wantsPhoto: true,
      featureCount: 4,
    });
    expect(hits[0]?.id).toBe("spotlight");
  });

  it("layout-get pie exposes char caps for compose", () => {
    const pie = layoutGet("pie");
    expect(pie.summary).toMatch(/pie chart/i);
    expect(pie.fields.find((f) => f.name === "H1")?.limit).toMatch(/≤42/);
    expect(pie.fields.find((f) => f.name === "items")?.limit).toMatch(/3–5/);
    expect(pie.fields.find((f) => f.name === "items[].label")?.limit).toMatch(/≤16/);
  });

  it("layout-match prefers pie for market share intent", () => {
    const hits = layoutMatch({ intent: "market share composition", hasNumbers: true, featureCount: 5 });
    expect(hits.some((h) => h.id === "pie")).toBe(true);
  });
});
