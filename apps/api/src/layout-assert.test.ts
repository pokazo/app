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
  assertSpotlightBodyContent,
  assertSpotlightLayout,
  assertStatementLayout,
  assertStatsLayout,
  assertTimelineLayout,
  assertTwoColsLayout,
  CARBON_LAYOUT_ICON_NAMES,
  isLayoutCarbonIcon,
  isLocalImagePath,
  layoutCarbonIconHints,
  layoutError,
  renderCarbonSvg,
  resolveCarbonIconName,
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
      "spotlight",
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

  it("uses stats: when items is empty array (asList shadow)", () => {
    expect(() =>
      assertStatsLayout({
        items: [],
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

  it("uses cards: when items is empty array (assertLayoutsInMarkdown asList)", () => {
    expect(() =>
      assertCardsLayout({
        items: [],
        cards: [{ title: "A" }, { title: "B" }],
      }),
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

describe("CARBON_LAYOUT_ICON_NAMES allowlist", () => {
  it("every allowlist name exists in @iconify-json/carbon", () => {
    for (const name of CARBON_LAYOUT_ICON_NAMES) {
      expect(resolveCarbonIconName(name), name).toBe(name);
      expect(isLayoutCarbonIcon(`carbon-${name}`), name).toBe(true);
    }
    expect(layoutCarbonIconHints()[0]).toBe("carbon-activity");
  });

  it("rejects invented carbon-* names not on the allowlist", () => {
    expect(isLayoutCarbonIcon("carbon-people")).toBe(false);
    expect(isLayoutCarbonIcon("carbon-shield-check")).toBe(false);
    expect(isLayoutCarbonIcon("carbon-handshake")).toBe(false);
    expect(isLayoutCarbonIcon("carbon-money")).toBe(true);
    expect(isLayoutCarbonIcon("carbon-user-multiple")).toBe(true);
    expect(isLayoutCarbonIcon("carbon-security")).toBe(true);
  });
});

describe("resolveCarbonIconName", () => {
  it("resolves carbon-* and bare names that exist in Carbon", () => {
    expect(resolveCarbonIconName("carbon-money")).toBe("money");
    expect(resolveCarbonIconName("money")).toBe("money");
    expect(resolveCarbonIconName("Carbon-Money")).toBe("money");
    expect(resolveCarbonIconName("partnership")).toBe("partnership");
    expect(resolveCarbonIconName("debug")).toBe("debug");
  });

  it("returns null for missing / wrong-set hints (diamond fallback bug)", () => {
    expect(resolveCarbonIconName("carbon-handshake")).toBeNull();
    expect(resolveCarbonIconName("carbon-shield")).toBeNull();
    expect(resolveCarbonIconName("network")).toBeNull();
    expect(resolveCarbonIconName("mdi-nonexistent-glyph")).toBeNull();
    expect(resolveCarbonIconName("")).toBeNull();
    expect(resolveCarbonIconName("  ")).toBeNull();
  });

  it("strips mdi- and resolves when the bare name exists in Carbon", () => {
    expect(resolveCarbonIconName("mdi-account")).toBe("account");
  });
});

describe("renderCarbonSvg", () => {
  it("renders SVG for bare resolvable hint (LLM omitted carbon- prefix)", () => {
    const svg = renderCarbonSvg("money", "40px");
    expect(svg).not.toBeNull();
    expect(svg?.attributes.height).toBe("40px");
    expect(svg?.body).toMatch(/path|circle|rect/i);
  });

  it("returns null for invented names so UI would show ◆ without assert", () => {
    expect(renderCarbonSvg("carbon-handshake", "40px")).toBeNull();
    expect(renderCarbonSvg("network", "40px")).toBeNull();
  });
});

describe("assertIconLayout", () => {
  it("throws LayoutError[icon] without iconHint", () => {
    expect(() => assertIconLayout({})).toThrow(/LayoutError\[icon\]/);
    expect(() => assertIconLayout({ iconHint: "  " })).toThrow(/LayoutError\[icon\]/);
  });
  it("throws LayoutError[icon] when iconHint does not resolve in Carbon", () => {
    expect(() => assertIconLayout({ iconHint: "carbon-handshake" })).toThrow(
      /LayoutError\[icon\]/,
    );
    expect(() => assertIconLayout({ iconHint: "network" })).toThrow(/LayoutError\[icon\]/);
  });
  it("passes with iconHint", () => {
    expect(() => assertIconLayout({ iconHint: "carbon-idea" })).not.toThrow();
    expect(() => assertIconLayout({ iconHint: "idea" })).not.toThrow();
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
    expect(() => assertHeroLayout({ variant: "centered" })).toThrow(/LayoutError\[hero\]/);
  });
  it("throws LayoutError[hero] when photo variants lack image", () => {
    expect(() => assertHeroLayout({ variant: "fullbleed" })).toThrow(/LayoutError\[hero\]/);
    expect(() => assertHeroLayout({ variant: "product" })).toThrow(/LayoutError\[hero\]/);
    expect(() => assertHeroLayout({ variant: "ribbon" })).toThrow(/requires local image/);
    expect(() => assertHeroLayout({ variant: "corner" })).toThrow(/requires local image/);
    expect(() => assertHeroLayout({ variant: "inset" })).toThrow(/requires local image/);
  });
  it("rejects removed editorial variant", () => {
    expect(() => assertHeroLayout({ variant: "editorial", image: "/slide-1.jpg" })).toThrow(
      /LayoutError\[hero\]/,
    );
  });
  it("passes valid variants", () => {
    expect(() =>
      assertHeroLayout({ variant: "ribbon", image: "/slide-1.jpg" }),
    ).not.toThrow();
    expect(() =>
      assertHeroLayout({ variant: "corner", image: "/slide-1.jpg" }),
    ).not.toThrow();
    expect(() =>
      assertHeroLayout({ variant: "inset", image: "/slide-1.jpg" }),
    ).not.toThrow();
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
  it("throws when any feature iconHint is outside the allowlist", () => {
    expect(() =>
      assertFeaturesLayout({
        items: [
          { title: "A", iconHint: "carbon-money" },
          { title: "B", iconHint: "carbon-people" },
          { title: "C", iconHint: "carbon-shield-check" },
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
  it("passes with bare Carbon names (LLM omitted carbon- prefix)", () => {
    expect(() =>
      assertFeaturesLayout({
        items: [
          { title: "Экономия", iconHint: "money" },
          { title: "Прямой контакт", iconHint: "partnership" },
          { title: "Надежность", iconHint: "security" },
        ],
      }),
    ).not.toThrow();
  });

  it("uses features: when items is empty array (asList shadow)", () => {
    expect(() =>
      assertFeaturesLayout({
        items: [],
        features: [
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
  it("throws when step iconHints do not resolve", () => {
    expect(() =>
      assertProcessLayout({
        steps: [
          { title: "A", iconHint: "request" },
          { title: "B", iconHint: "server" },
          { title: "C", iconHint: "confirm" },
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
  it("passes with bare resolvable step hints", () => {
    expect(() =>
      assertProcessLayout({
        steps: [
          { title: "A", iconHint: "document" },
          { title: "B", iconHint: "list" },
          { title: "C", iconHint: "checkmark" },
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

const fourPairs = [
  { title: "Clarity", body: "Short label, no filler." },
  { title: "Pace", body: "Scan hierarchy fast." },
  { title: "Trust", body: "Named sources, proof." },
  { title: "Focus", body: "One idea, four points." },
];

describe("assertSpotlightLayout", () => {
  it("throws without local image, palette, or exactly 4 pairs", () => {
    expect(() =>
      assertSpotlightLayout({ palette: "ocean", items: fourPairs }),
    ).toThrow(/LayoutError\[spotlight\].*image/);
    expect(() =>
      assertSpotlightLayout({
        image: "/slide-1.png",
        palette: "nope",
        items: fourPairs,
      }),
    ).toThrow(/LayoutError\[spotlight\].*palette/);
    expect(() =>
      assertSpotlightLayout({
        image: "/slide-1.png",
        palette: "ocean",
        items: fourPairs.slice(0, 2),
      }),
    ).toThrow(/LayoutError\[spotlight\].*exactly 4/);
  });

  it("throws when pair title/body exceed char caps", () => {
    expect(() =>
      assertSpotlightLayout({
        image: "/slide-1.png",
        palette: "ocean",
        items: [
          { title: "This title is way too long!!", body: "ok" },
          ...fourPairs.slice(1),
        ],
      }),
    ).toThrow(/LayoutError\[spotlight\].*title too long/);
    expect(() =>
      assertSpotlightLayout({
        image: "/slide-1.png",
        palette: "ocean",
        items: [
          {
            title: "Ok",
            body: "x".repeat(49),
          },
          ...fourPairs.slice(1),
        ],
      }),
    ).toThrow(/LayoutError\[spotlight\].*body too long/);
  });

  it("passes with valid spotlight props", () => {
    expect(() =>
      assertSpotlightLayout({
        image: "/slide-1.png",
        palette: "ocean",
        kicker: "SPOTLIGHT",
        items: fourPairs,
      }),
    ).not.toThrow();
  });
});

describe("assertSpotlightBodyContent", () => {
  it("throws without H1 or description or when over char caps", () => {
    expect(() => assertSpotlightBodyContent("no heading")).toThrow(
      /LayoutError\[spotlight\].*H1/,
    );
    expect(() => assertSpotlightBodyContent("# Only title\n")).toThrow(
      /LayoutError\[spotlight\].*description/,
    );
    expect(() =>
      assertSpotlightBodyContent(`# ${"A".repeat(43)}\n\nShort desc.`),
    ).toThrow(/LayoutError\[spotlight\].*H1 too long/);
    expect(() =>
      assertSpotlightBodyContent(`# Title\n\n${"d".repeat(91)}`),
    ).toThrow(/LayoutError\[spotlight\].*description too long/);
  });

  it("passes with short H1 + description", () => {
    expect(() =>
      assertSpotlightBodyContent("# Product that leads\n\nOne short promise under the title."),
    ).not.toThrow();
  });
});
