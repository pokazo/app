import { describe, expect, it } from "vitest";
import {
  assertCardsLayout,
  assertFactLayout,
  assertHeroLayout,
  assertIconLayout,
  assertImageLayout,
  assertQuoteLayout,
  assertSkillsLayout,
  assertStatsLayout,
  assertTimelineLayout,
  assertTwoColsLayout,
  isLocalImagePath,
  layoutError,
} from "../slidev-layouts/layout-assert.js"; // plain JS — Slidev copies this into decks

describe("layoutError", () => {
  it("uses stable prefix", () => {
    expect(layoutError("stats", "x").message).toBe("LayoutError[stats]: x");
  });
});

describe("isLocalImagePath", () => {
  it("accepts local paths", () => {
    expect(isLocalImagePath("/slide-1.jpg")).toBe(true);
    expect(isLocalImagePath("slide-1.jpg")).toBe(true);
  });
  it("rejects empty and http", () => {
    expect(isLocalImagePath("")).toBe(false);
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
  it("throws when empty", () => {
    expect(() => assertStatsLayout({ items: [] })).toThrow(/LayoutError\[stats\]/);
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
  it("throws with one card", () => {
    expect(() => assertCardsLayout({ items: [{ title: "Only" }] })).toThrow(
      /LayoutError\[cards\]/,
    );
  });
  it("passes with two titles", () => {
    expect(() =>
      assertCardsLayout({ items: [{ title: "A" }, { title: "B" }] }),
    ).not.toThrow();
  });
});

describe("assertSkillsLayout", () => {
  it("throws without names", () => {
    expect(() => assertSkillsLayout({ items: [{ pct: 50 }] })).toThrow(
      /LayoutError\[skills\]/,
    );
  });
});

describe("assertTimelineLayout", () => {
  it("throws with two steps", () => {
    expect(() =>
      assertTimelineLayout({
        steps: [{ title: "A" }, { title: "B" }],
      }),
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
  it("requires iconHint", () => {
    expect(() => assertIconLayout({})).toThrow(/LayoutError\[icon\]/);
    expect(() => assertIconLayout({ iconHint: "carbon-idea" })).not.toThrow();
  });
});

describe("assertImageLayout", () => {
  it("requires local image", () => {
    expect(() => assertImageLayout("image-right", {})).toThrow(/LayoutError\[image-right\]/);
    expect(() =>
      assertImageLayout("image-left", { image: "https://evil/x.jpg" }),
    ).toThrow(/LayoutError\[image-left\]/);
    expect(() =>
      assertImageLayout("image-right", { image: "/slide-2.jpg" }),
    ).not.toThrow();
  });
});

describe("assertHeroLayout", () => {
  it("rejects invalid variant", () => {
    expect(() => assertHeroLayout({ variant: "split" })).toThrow(/LayoutError\[hero\]/);
  });
  it("requires image for fullbleed", () => {
    expect(() => assertHeroLayout({ variant: "fullbleed" })).toThrow(/LayoutError\[hero\]/);
    expect(() =>
      assertHeroLayout({ variant: "fullbleed", image: "/slide-1.jpg" }),
    ).not.toThrow();
  });
  it("allows centered without image", () => {
    expect(() => assertHeroLayout({ variant: "centered" })).not.toThrow();
  });
});

describe("slot layouts", () => {
  it("quote/fact need body slot", () => {
    expect(() => assertQuoteLayout({ hasBodySlot: false })).toThrow(/LayoutError\[quote\]/);
    expect(() => assertFactLayout({ hasBodySlot: true })).not.toThrow();
  });
  it("two-cols needs both columns", () => {
    expect(() =>
      assertTwoColsLayout({ hasLeftSlot: true, hasRightSlot: false }),
    ).toThrow(/LayoutError\[two-cols\]/);
  });
});
