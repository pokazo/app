import { describe, expect, it } from "vitest";
import {
  assertLayoutsInMarkdown,
  parseSlideBlocks,
  parseSimpleYaml,
} from "./layout-md-assert.js";
import {
  BAD_LAYOUT_MARKDOWN,
  LAYOUT_SHOT_ORDER,
  badMarkdownForLayout,
  happyPathLayoutsMarkdown,
} from "./layout-fixtures.js";

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
  it("accepts happy-path gallery for all custom layouts", () => {
    expect(() => assertLayoutsInMarkdown(happyPathLayoutsMarkdown())).not.toThrow();
    const layouts = parseSlideBlocks(happyPathLayoutsMarkdown())
      .map((b) => b.fm.layout)
      .filter(Boolean);
    for (const name of LAYOUT_SHOT_ORDER) {
      expect(layouts, `gallery missing ${name}`).toContain(name);
    }
  });

  it.each(LAYOUT_SHOT_ORDER)(
    "throws LayoutError[%s] for undrawable %s slide",
    (layout) => {
      const md = badMarkdownForLayout(layout);
      expect(BAD_LAYOUT_MARKDOWN[layout]).toBeTruthy();
      expect(() => assertLayoutsInMarkdown(md)).toThrow(
        new RegExp(`LayoutError\\[${layout}\\]`),
      );
    },
  );
});
