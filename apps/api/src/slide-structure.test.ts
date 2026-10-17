import { describe, expect, it } from "vitest";
import { Outline, parseOutline, type OutlineT } from "./outline.js";
import {
  EMPTY_SLIDE_HEADING,
  SLIDE_COUNT_MAX,
  emptyOutlineSlide,
  joinRawSlideBlocks,
  mutateSlideStructure,
  remapSpeechDoc,
  splitRawSlideBlocks,
} from "./slide-structure.js";

function stubSlide(heading: string): ReturnType<typeof emptyOutlineSlide> {
  return { ...emptyOutlineSlide(heading), intent: heading };
}

function makeOutline(headings: string[]): OutlineT {
  return Outline.parse({
    title: "Demo",
    slides: headings.map(stubSlide),
  });
}

function makeMd(layouts: string[]): string {
  return joinRawSlideBlocks(
    layouts.map(
      (layout, i) => `---\nlayout: ${layout}\n---\n\n# Slide ${i + 1}\n`,
    ),
  );
}

describe("splitRawSlideBlocks / joinRawSlideBlocks", () => {
  it("round-trips slide chunks without losing frontmatter", () => {
    const md = `---
theme: default
layout: hero
variant: fullbleed
---

# Cover

---
layout: statement
---

# Body
`;
    const blocks = splitRawSlideBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("layout: hero");
    expect(blocks[0]).toContain("# Cover");
    expect(blocks[1]).toContain("layout: statement");
    const joined = joinRawSlideBlocks(blocks);
    expect(splitRawSlideBlocks(joined)).toHaveLength(2);
    expect(joined).toContain("variant: fullbleed");
  });
});

describe("mutateSlideStructure move", () => {
  it("moves a slide to an absolute index in md and outline", () => {
    const md = makeMd(["statement", "fact", "quote"]);
    const outline = makeOutline(["A", "B", "C"]);
    const result = mutateSlideStructure(md, outline, {
      op: "move",
      from: 1,
      to: 3,
    });
    expect(result.focusViewIndex).toBe(3);
    expect(result.outline.slides.map((s) => s.heading)).toEqual(["B", "C", "A"]);
    const blocks = splitRawSlideBlocks(result.md);
    expect(blocks[0]).toContain("# Slide 2");
    expect(blocks[2]).toContain("# Slide 1");
    expect(result.outlineIndexMap.get(1)).toBe(3);
    expect(result.outlineIndexMap.get(2)).toBe(1);
  });

  it("swaps adjacent slides when to is neighbor", () => {
    const md = makeMd(["statement", "fact", "quote"]);
    const outline = makeOutline(["A", "B", "C"]);
    const result = mutateSlideStructure(md, outline, {
      op: "move",
      from: 2,
      to: 3,
    });
    expect(result.focusViewIndex).toBe(3);
    expect(result.outline.slides.map((s) => s.heading)).toEqual(["A", "C", "B"]);
    const blocks = splitRawSlideBlocks(result.md);
    expect(blocks[1]).toContain("# Slide 3");
    expect(blocks[2]).toContain("# Slide 2");
  });

  it("moves orphan hero md without dropping outline slides", () => {
    const md = makeMd(["hero", "statement", "fact", "quote"]);
    const outline = makeOutline(["A", "B", "C"]);
    const result = mutateSlideStructure(md, outline, {
      op: "move",
      from: 1,
      to: 2,
    });
    expect(result.outline.slides.map((s) => s.heading)).toEqual(["A", "B", "C"]);
    const blocks = splitRawSlideBlocks(result.md);
    expect(blocks[0]).toContain("layout: statement");
    expect(blocks[1]).toContain("layout: hero");
    expect(result.focusViewIndex).toBe(2);
  });

  it("rejects move past edges", () => {
    const md = makeMd(["statement", "fact", "quote"]);
    const outline = makeOutline(["A", "B", "C"]);
    expect(() => mutateSlideStructure(md, outline, { op: "move", from: 1, to: 0 })).toThrow(
      /bad move/,
    );
    expect(() => mutateSlideStructure(md, outline, { op: "move", from: 3, to: 4 })).toThrow(
      /bad move/,
    );
  });

  it("moves after parsing a legacy outline missing cards/palette/pie/chartTitle", () => {
    const md = makeMd(["statement", "fact", "quote"]);
    const legacy = parseOutline({
      title: "Demo",
      slides: ["A", "B", "C"].map((heading) => ({
        heading,
        points: [],
        intent: heading,
        visual: "statement",
        imageQuery: "",
        iconHint: "",
        kicker: "",
        source: "",
        steps: [],
        stats: [],
        skills: [],
      })),
    });
    const result = mutateSlideStructure(md, legacy, { op: "move", from: 1, to: 3 });
    expect(result.outline.slides.map((s) => s.heading)).toEqual(["B", "C", "A"]);
    expect(result.outline.slides[0]?.cards).toEqual([]);
    expect(result.outline.slides[0]?.palette).toBe("");
  });
});

describe("mutateSlideStructure delete", () => {
  it("deletes outline slide when above minimum", () => {
    const md = makeMd(["statement", "fact", "quote", "cards"]);
    const outline = makeOutline(["A", "B", "C", "D"]);
    const result = mutateSlideStructure(md, outline, { op: "delete", viewIndex: 2 });
    expect(result.outline.slides.map((s) => s.heading)).toEqual(["A", "C", "D"]);
    expect(splitRawSlideBlocks(result.md)).toHaveLength(3);
    expect(result.focusViewIndex).toBe(2);
    expect(result.outlineIndexMap.has(2)).toBe(false);
    expect(result.outlineIndexMap.get(3)).toBe(2);
  });

  it("refuses deleting when outline at minimum", () => {
    const md = makeMd(["statement", "fact", "quote"]);
    const outline = makeOutline(["A", "B", "C"]);
    expect(() => mutateSlideStructure(md, outline, { op: "delete", viewIndex: 2 })).toThrow(
      /min slides/,
    );
  });

  it("allows deleting orphan hero at minimum outline", () => {
    const md = makeMd(["hero", "statement", "fact", "quote"]);
    const outline = makeOutline(["A", "B", "C"]);
    const result = mutateSlideStructure(md, outline, { op: "delete", viewIndex: 1 });
    expect(result.outline.slides.map((s) => s.heading)).toEqual(["A", "B", "C"]);
    expect(splitRawSlideBlocks(result.md)).toHaveLength(3);
    expect(splitRawSlideBlocks(result.md)[0]).toContain("layout: statement");
  });
});

describe("mutateSlideStructure insert", () => {
  it("inserts empty slide after current view index", () => {
    const md = makeMd(["statement", "fact", "quote"]);
    const outline = makeOutline(["A", "B", "C"]);
    const result = mutateSlideStructure(md, outline, { op: "insert", after: 2 });
    expect(result.focusViewIndex).toBe(3);
    expect(result.outline.slides.map((s) => s.heading)).toEqual([
      "A",
      "B",
      EMPTY_SLIDE_HEADING,
      "C",
    ]);
    const blocks = splitRawSlideBlocks(result.md);
    expect(blocks).toHaveLength(4);
    expect(blocks[2]).toContain("layout: statement");
    expect(blocks[2]).toContain(`# ${EMPTY_SLIDE_HEADING}`);
    expect(result.outlineIndexMap.get(3)).toBe(4);
  });

  it("inserts after orphan hero into outline start", () => {
    const md = makeMd(["hero", "statement", "fact", "quote"]);
    const outline = makeOutline(["A", "B", "C"]);
    const result = mutateSlideStructure(md, outline, { op: "insert", after: 1 });
    expect(result.focusViewIndex).toBe(2);
    expect(result.outline.slides[0]?.heading).toBe(EMPTY_SLIDE_HEADING);
    expect(result.outline.slides.map((s) => s.heading)).toEqual([
      EMPTY_SLIDE_HEADING,
      "A",
      "B",
      "C",
    ]);
  });

  it("refuses insert at max outline length", () => {
    const headings = Array.from({ length: SLIDE_COUNT_MAX }, (_, i) => `S${i + 1}`);
    const md = makeMd(headings.map(() => "statement"));
    const outline = makeOutline(headings);
    expect(() => mutateSlideStructure(md, outline, { op: "insert", after: 1 })).toThrow(
      /max slides/,
    );
  });
});

describe("remapSpeechDoc", () => {
  it("remaps indices after delete", () => {
    const outline = makeOutline(["A", "C", "D"]);
    const map = new Map([
      [1, 1],
      [3, 2],
      [4, 3],
    ]);
    const remapped = remapSpeechDoc(
      {
        slides: [
          { index: 1, heading: "A", theses: "t1", speech: "s1" },
          { index: 2, heading: "B", theses: "t2", speech: "s2" },
          { index: 3, heading: "C", theses: "t3", speech: "s3" },
        ],
      },
      map,
      outline,
    );
    expect(remapped?.slides.map((s) => s.index)).toEqual([1, 2]);
    expect(remapped?.slides[1]?.heading).toBe("C");
  });
});
