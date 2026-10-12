import { describe, expect, it } from "vitest";
import {
  applyLockedVisual,
  layoutToOutlineVisual,
  lockedSlideLayoutFromMarkdown,
  mapViewSlideToOutline,
  resolveRewriteSlideTargets,
  slidevIndexForOutlineSlide,
} from "./rewrite-lock.js";

const sampleSlide = {
  heading: "H",
  points: ["a"],
  intent: "x",
  visual: "stats" as const,
  imageQuery: "",
  iconHint: "",
  kicker: "",
  source: "",
  steps: [],
  stats: [
    { value: "1", label: "A", note: "" },
    { value: "2", label: "B", note: "" },
  ],
  skills: [],
  cards: [],
  features: [],
  process: [],
};

/** Prod bug: hero composed separately, then all outline slides inserted → md = outline+1. */
const orphanHeroMd = `---
layout: hero
variant: ribbon
image: /slide-1.jpg
---

# Битлз для школьников

---
layout: timeline
kicker: Этапы
---

# История

---
layout: features
items:
  - title: A
    body: a
    iconHint: carbon-idea
  - title: B
    body: b
    iconHint: carbon-security
  - title: C
    body: c
    iconHint: carbon-rocket
---

# Успех

---
layout: image-left
image: /slide-4.jpg
---

# Знаковые песни
`;

describe("rewrite-lock", () => {
  it("maps slidev layout to outline visual", () => {
    expect(layoutToOutlineVisual("hero", "stats")).toBe("hero");
    expect(layoutToOutlineVisual("timeline", "hero")).toBe("timeline");
    expect(layoutToOutlineVisual("unknown", "quote")).toBe("quote");
  });

  it("reads locked layout/variant/image from markdown", () => {
    const md = `---
layout: hero
variant: ribbon
image: /slide-1.jpg
---

# Title

---
layout: timeline
steps:
  - phase: "1"
    title: A
    body: B
    state: done
---

# Next
`;
    const hero = lockedSlideLayoutFromMarkdown(md, 1, "cover");
    expect(hero).toEqual({
      layout: "hero",
      variant: "ribbon",
      image: "/slide-1.jpg",
      visual: "hero",
    });
    const two = lockedSlideLayoutFromMarkdown(md, 2, "stats");
    expect(two.layout).toBe("timeline");
    expect(two.visual).toBe("timeline");
    expect(two.variant).toBe("");
  });

  it("forces visual on outline slide", () => {
    const locked = {
      layout: "hero",
      variant: "ribbon",
      image: "/slide-1.jpg",
      visual: "hero" as const,
    };
    const out = applyLockedVisual({ ...sampleSlide, visual: "timeline" }, locked);
    expect(out.visual).toBe("hero");
    expect(out.heading).toBe("H");
  });

  describe("orphan leading hero (outline count + 1 in md)", () => {
    it("maps outline slide index to Slidev page after the extra hero", () => {
      expect(slidevIndexForOutlineSlide(orphanHeroMd, 1, 3)).toBe(2);
      expect(slidevIndexForOutlineSlide(orphanHeroMd, 2, 3)).toBe(3);
      expect(slidevIndexForOutlineSlide(orphanHeroMd, 3, 3)).toBe(4);
    });

    it("keeps 1:1 mapping when outline and md lengths match", () => {
      const aligned = `---
layout: hero
image: /h.jpg
---

# Hero

---
layout: image-left
image: /b.jpg
---

# Body
`;
      expect(slidevIndexForOutlineSlide(aligned, 1, 2)).toBe(1);
      expect(slidevIndexForOutlineSlide(aligned, 2, 2)).toBe(2);
    });

    it("locks outline slide 3 to image-left, not features (prod rewrite bug)", () => {
      const locked = lockedSlideLayoutFromMarkdown(orphanHeroMd, 3, "image-left", 3);
      expect(locked.layout).toBe("image-left");
      expect(locked.visual).toBe("image-left");
      expect(locked.image).toBe("/slide-4.jpg");
    });

    it("resolveRewriteSlideTargets pins compose MCP to Slidev page, not outline index", () => {
      const t = resolveRewriteSlideTargets({
        md: orphanHeroMd,
        outlineSlideIndex: 3,
        outlineSlideCount: 3,
        fallbackVisual: "image-left",
      });
      expect(t.slidevIndex).toBe(4);
      expect(t.locked.layout).toBe("image-left");
      expect(t.isHero).toBe(false);
    });

    it("maps view slide index to outline when orphan hero is listed as slide 1", () => {
      expect(mapViewSlideToOutline(orphanHeroMd, 1, 3)).toEqual({ kind: "orphan-hero", slidevIndex: 1 });
      expect(mapViewSlideToOutline(orphanHeroMd, 2, 3)).toEqual({
        kind: "outline",
        outlineSlideIndex: 1,
        slidevIndex: 2,
      });
      expect(mapViewSlideToOutline(orphanHeroMd, 4, 3)).toEqual({
        kind: "outline",
        outlineSlideIndex: 3,
        slidevIndex: 4,
      });
    });

    it("maps view index 1:1 when outline and md are aligned", () => {
      const aligned = `---
layout: hero
image: /h.jpg
---

# Hero

---
layout: image-left
image: /b.jpg
---

# Body
`;
      expect(mapViewSlideToOutline(aligned, 1, 2)).toEqual({
        kind: "outline",
        outlineSlideIndex: 1,
        slidevIndex: 1,
      });
      expect(mapViewSlideToOutline(aligned, 2, 2)).toEqual({
        kind: "outline",
        outlineSlideIndex: 2,
        slidevIndex: 2,
      });
    });
  });
});
