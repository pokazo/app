import { describe, expect, it } from "vitest";
import {
  HERO_CATALOG,
  assertHeroCatalogComplete,
  heroGet,
  heroList,
} from "./hero-catalog.js";
import { HERO_VARIANTS } from "./hero-skill.js";

describe("hero catalog", () => {
  it("covers every HERO_VARIANTS id once", () => {
    expect(() => assertHeroCatalogComplete()).not.toThrow();
    expect(HERO_CATALOG.map((e) => e.id)).toEqual([...HERO_VARIANTS]);
  });

  it("heroList returns needs for decision-making", () => {
    const rows = heroList();
    expect(rows).toHaveLength(HERO_VARIANTS.length);
    for (const row of rows) {
      expect(row.needs.length).toBeGreaterThan(0);
      expect(row.summary.length).toBeGreaterThan(8);
      expect(row.whenToUse.length).toBeGreaterThan(8);
    }
  });

  it("heroGet returns full contract", () => {
    const ribbon = heroGet("ribbon");
    expect(ribbon.frontmatter).toMatch(/variant: ribbon/);
    expect(ribbon.antiPatterns.length).toBeGreaterThan(4);
    expect(ribbon.displays.length).toBeGreaterThan(4);
  });

  it("heroGet rejects unknown ids", () => {
    expect(() => heroGet("centered")).toThrow(/Unknown hero variant/);
    expect(() => heroGet("nope")).toThrow(/Unknown hero variant/);
  });
});
