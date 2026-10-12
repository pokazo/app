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

  it("heroList returns needs and fields for decision-making", () => {
    const rows = heroList();
    expect(rows).toHaveLength(HERO_VARIANTS.length);
    for (const row of rows) {
      expect(row.needs.length).toBeGreaterThan(0);
      expect(row.summary.length).toBeGreaterThan(8);
      expect(row.whenToUse.length).toBeGreaterThan(8);
      expect(row.fields.length).toBeGreaterThanOrEqual(8);
      const names = row.fields.map((f) => f.name);
      expect(names).toEqual(
        expect.arrayContaining(["layout", "variant", "image", "H1", "promise"]),
      );
      expect(row.fields.find((f) => f.name === "layout")?.required).toBe(true);
      expect(row.fields.find((f) => f.name === "variant")?.required).toBe(true);
      expect(row.fields.find((f) => f.name === "image")?.required).toBe(true);
      expect(row.fields.find((f) => f.name === "H1")?.required).toBe(true);
      expect(row.fields.find((f) => f.name === "promise")?.required).toBe(true);
    }
  });

  it("heroGet returns full contract with fields limits", () => {
    const ribbon = heroGet("ribbon");
    expect(ribbon.frontmatter).toMatch(/variant: ribbon/);
    expect(ribbon.antiPatterns.length).toBeGreaterThan(4);
    expect(ribbon.displays.length).toBeGreaterThan(4);
    expect(ribbon.fields.find((f) => f.name === "variant")?.type).toBe("ribbon");
    expect(ribbon.fields.find((f) => f.name === "H1")?.limit).toMatch(/2–6/);
    const product = heroGet("product");
    expect(product.fields.find((f) => f.name === "H1")?.limit).toMatch(/clips/i);
  });

  it("heroGet rejects unknown ids", () => {
    expect(() => heroGet("centered")).toThrow(/Unknown hero variant/);
    expect(() => heroGet("nope")).toThrow(/Unknown hero variant/);
  });
});
