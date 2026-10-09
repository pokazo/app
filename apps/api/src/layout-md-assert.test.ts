import { describe, expect, it } from "vitest";
import {
  assertLayoutsInMarkdown,
  parseSlideBlocks,
  parseSimpleYaml,
} from "./layout-md-assert.js";
import { badStatsMarkdown, happyPathLayoutsMarkdown } from "./layout-fixtures.js";

describe("parseSimpleYaml", () => {
  it("parses items list", () => {
    const fm = parseSimpleYaml(`layout: stats
items:
  - value: "42"
    label: Ships
  - value: "9"
    label: Teams
`);
    expect(fm.layout).toBe("stats");
    expect(fm.items).toEqual([
      { value: "42", label: "Ships" },
      { value: "9", label: "Teams" },
    ]);
  });
});

describe("assertLayoutsInMarkdown", () => {
  it("accepts happy-path gallery", () => {
    expect(() => assertLayoutsInMarkdown(happyPathLayoutsMarkdown())).not.toThrow();
  });

  it("throws LayoutError[stats] for sparse stats", () => {
    expect(() => assertLayoutsInMarkdown(badStatsMarkdown())).toThrow(/LayoutError\[stats\]/);
  });

  it("parses gallery into layout slides", () => {
    const blocks = parseSlideBlocks(happyPathLayoutsMarkdown());
    const layouts = blocks.map((b) => b.fm.layout).filter(Boolean);
    expect(layouts).toContain("hero");
    expect(layouts).toContain("two-cols");
    expect(layouts).toContain("skills");
  });
});
