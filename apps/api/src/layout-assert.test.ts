import { describe, expect, it } from "vitest";
import {
  assertCardsLayout,
  assertFactLayout,
  assertFeaturesLayout,
  assertHeroLayout,
  assertIconLayout,
  assertImageLayout,
  assertProcessLayout,
  assertQuoteLayout,
  assertSkillsLayout,
  assertStatementLayout,
  assertStatsLayout,
  assertTimelineLayout,
  assertTwoColsLayout,
  isLocalImagePath,
  layoutError,
} from "../slidev-layouts/layout-assert.js";

describe("layoutError", () => {
  it("uses stable prefix for every layout name", () => {
    for (const name of [
      "hero",
      "image-right",
      "image-left",
      "two-cols",
      "quote",
      "fact",
      "icon",
      "cards",
      "timeline",
      "stats",
      "skills",
      "statement",
      "features",
      "process",
    ]) {
      expect(layoutError(name, "x").message).toBe(`LayoutError[${name}]: x`);
    }
  });
});

describe("isLocalImagePath", () => {
  it("accepts local paths", () => {
    expect(isLocalImagePath("/slide-1.jpg")).toBe(true);
    expect(isLocalImagePath("slide-1.jpg")).toBe(true);
  });
  it("rejects empty and http", () => {
    expect(isLocalImagePath("")).toBe(false);
    expect(isLocalImagePath(null)).toBe(false);
    expect(isLocalImagePath("https://x/y.jpg")).toBe(false);
  });
});

describe("assertStatsLayout", () => {
  it("passes with ≥2 valued items", () => {
    expect(() =>
      assertStatsLayout({
        items: [
          { value: "10", label: "A" },
          { value: "20", label: "B" },
        ],
      }),
    ).not.toThrow();
  });
  it("throws LayoutError[stats] when empty or incomplete", () => {
    expect(() => assertStatsLayout({ items: [] })).toThrow(/LayoutError\[stats\]/);
    expect(() => assertStatsLayout({ items: [{ value: "1", label: "Only" }] })).toThrow(
      /LayoutError\[stats\]/,
    );
    expect(() => assertStatsLayout({ items: [{ value: "1" }, { value: "2" }] })).toThrow(
      /LayoutError\[stats\]/,
    );
  });
  it("accepts stats: alias", () => {
    expect(() =>
      assertStatsLayout({
        stats: [
          { value: "1", label: "A" },
          { value: "2", label: "B" },
        ],
      }),
    ).not.toThrow();
  });
});

describe("assertCardsLayout", () => {
  it("throws LayoutError[cards] with <2 titles", () => {
    expect(() => assertCardsLayout({ items: [] })).toThrow(/LayoutError\[cards\]/);
    expect(() => assertCardsLayout({ items: [{ title: "Only" }] })).toThrow(
      /LayoutError\[cards\]/,
    );
    expect(() => assertCardsLayout({ items: [{ body: "no title" }, { body: "x" }] })).toThrow(
      /LayoutError\[cards\]/,
    );
  });
  it("passes with two titles and cards: alias", () => {
    expect(() =>
      assertCardsLayout({ items: [{ title: "A" }, { title: "B" }] }),
    ).not.toThrow();
    expect(() =>
      assertCardsLayout({ cards: [{ title: "A" }, { title: "B" }] }),
    ).not.toThrow();
  });
});

describe("assertSkillsLayout", () => {
  it("throws LayoutError[skills] without ≥2 names", () => {
    expect(() => assertSkillsLayout({ items: [] })).toThrow(/LayoutError\[skills\]/);
    expect(() => assertSkillsLayout({ items: [{ pct: 50 }] })).toThrow(/LayoutError\[skills\]/);
    expect(() => assertSkillsLayout({ items: [{ name: "Solo" }] })).toThrow(
      /LayoutError\[skills\]/,
    );
  });
  it("passes with two names", () => {
    expect(() =>
      assertSkillsLayout({ items: [{ name: "TS" }, { name: "Vue" }] }),
    ).not.toThrow();
  });
});

describe("assertTimelineLayout", () => {
  it("throws LayoutError[timeline] with <3 titled steps", () => {
    expect(() => assertTimelineLayout({ steps: [] })).toThrow(/LayoutError\[timeline\]/);
    expect(() =>
      assertTimelineLayout({ steps: [{ title: "A" }, { title: "B" }] }),
    ).toThrow(/LayoutError\[timeline\]/);
  });
  it("passes with three", () => {
    expect(() =>
      assertTimelineLayout({
        steps: [{ title: "A" }, { title: "B" }, { title: "C" }],
      }),
    ).not.toThrow();
  });
});

describe("assertIconLayout", () => {
  it("throws LayoutError[icon] without iconHint", () => {
    expect(() => assertIconLayout({})).toThrow(/LayoutError\[icon\]/);
    expect(() => assertIconLayout({ iconHint: "  " })).toThrow(/LayoutError\[icon\]/);
  });
  it("passes with iconHint", () => {
    expect(() => assertIconLayout({ iconHint: "carbon-idea" })).not.toThrow();
  });
});

describe("assertImageLayout", () => {
  it("throws LayoutError[image-right] / [image-left]", () => {
    expect(() => assertImageLayout("image-right", {})).toThrow(/LayoutError\[image-right\]/);
    expect(() => assertImageLayout("image-left", {})).toThrow(/LayoutError\[image-left\]/);
    expect(() =>
      assertImageLayout("image-left", { image: "https://evil/x.jpg" }),
    ).toThrow(/LayoutError\[image-left\]/);
  });
  it("passes with local image", () => {
    expect(() =>
      assertImageLayout("image-right", { image: "/slide-2.jpg" }),
    ).not.toThrow();
    expect(() =>
      assertImageLayout("image-left", { image: "/slide-3.png" }),
    ).not.toThrow();
  });
});

describe("assertHeroLayout", () => {
  it("throws LayoutError[hero] on invalid / missing variant", () => {
    expect(() => assertHeroLayout({})).toThrow(/LayoutError\[hero\]/);
    expect(() => assertHeroLayout({ variant: "split" })).toThrow(/LayoutError\[hero\]/);
    expect(() => assertHeroLayout({ variant: "interactive" })).toThrow(/LayoutError\[hero\]/);
  });
  it("throws LayoutError[hero] when fullbleed/product lack image", () => {
    expect(() => assertHeroLayout({ variant: "fullbleed" })).toThrow(/LayoutError\[hero\]/);
    expect(() => assertHeroLayout({ variant: "product" })).toThrow(/LayoutError\[hero\]/);
  });
  it("passes valid variants", () => {
    expect(() => assertHeroLayout({ variant: "centered" })).not.toThrow();
    expect(() => assertHeroLayout({ variant: "editorial" })).not.toThrow();
    expect(() =>
      assertHeroLayout({ variant: "fullbleed", image: "/slide-1.jpg" }),
    ).not.toThrow();
    expect(() =>
      assertHeroLayout({ variant: "product", image: "/slide-1.jpg" }),
    ).not.toThrow();
  });
});

describe("assertQuoteLayout / assertFactLayout / assertStatementLayout", () => {
  it("throws LayoutError[quote] / [fact] / [statement] without body slot", () => {
    expect(() => assertQuoteLayout({ hasBodySlot: false })).toThrow(/LayoutError\[quote\]/);
    expect(() => assertFactLayout({ hasBodySlot: false })).toThrow(/LayoutError\[fact\]/);
    expect(() => assertStatementLayout({ hasBodySlot: false })).toThrow(/LayoutError\[statement\]/);
  });
  it("passes with body slot", () => {
    expect(() => assertQuoteLayout({ hasBodySlot: true })).not.toThrow();
    expect(() => assertFactLayout({ hasBodySlot: true })).not.toThrow();
    expect(() => assertStatementLayout({ hasBodySlot: true })).not.toThrow();
  });
});

describe("assertFeaturesLayout", () => {
  it("throws LayoutError[features] without ≥3 titled icon items", () => {
    expect(() => assertFeaturesLayout({ items: [] })).toThrow(/LayoutError\[features\]/);
    expect(() =>
      assertFeaturesLayout({
        items: [
          { title: "A", iconHint: "carbon-idea" },
          { title: "B", iconHint: "carbon-idea" },
        ],
      }),
    ).toThrow(/LayoutError\[features\]/);
  });
  it("passes with 3 items", () => {
    expect(() =>
      assertFeaturesLayout({
        items: [
          { title: "A", iconHint: "carbon-idea" },
          { title: "B", iconHint: "carbon-security" },
          { title: "C", iconHint: "carbon-rocket" },
        ],
      }),
    ).not.toThrow();
  });
});

describe("assertProcessLayout", () => {
  it("throws LayoutError[process] without ≥3 steps", () => {
    expect(() => assertProcessLayout({ steps: [] })).toThrow(/LayoutError\[process\]/);
    expect(() =>
      assertProcessLayout({
        steps: [
          { title: "A", iconHint: "carbon-idea" },
          { title: "B", iconHint: "carbon-idea" },
        ],
      }),
    ).toThrow(/LayoutError\[process\]/);
  });
  it("passes with 3 steps", () => {
    expect(() =>
      assertProcessLayout({
        steps: [
          { title: "A", iconHint: "carbon-document" },
          { title: "B", iconHint: "carbon-list" },
          { title: "C", iconHint: "carbon-checkmark" },
        ],
      }),
    ).not.toThrow();
  });
});

describe("assertTwoColsLayout", () => {
  it("throws LayoutError[two-cols] if either column missing", () => {
    expect(() =>
      assertTwoColsLayout({ hasLeftSlot: false, hasRightSlot: false }),
    ).toThrow(/LayoutError\[two-cols\]/);
    expect(() =>
      assertTwoColsLayout({ hasLeftSlot: true, hasRightSlot: false }),
    ).toThrow(/LayoutError\[two-cols\]/);
    expect(() =>
      assertTwoColsLayout({ hasLeftSlot: false, hasRightSlot: true }),
    ).toThrow(/LayoutError\[two-cols\]/);
  });
  it("passes with both columns", () => {
    expect(() =>
      assertTwoColsLayout({ hasLeftSlot: true, hasRightSlot: true }),
    ).not.toThrow();
  });
});
