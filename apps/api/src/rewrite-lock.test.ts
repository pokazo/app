import { describe, expect, it } from "vitest";
import {
  applyLockedVisual,
  layoutToOutlineVisual,
  lockedSlideLayoutFromMarkdown,
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
});
