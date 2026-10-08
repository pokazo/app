import { describe, expect, it } from "vitest";
import {
  outlineTitle,
  parseSlideImages,
  slidesForView,
  slidesFromOutline,
  withSlideImages,
} from "./view-meta.js";

describe("slidesFromOutline", () => {
  it("maps headings 1-based", () => {
    expect(
      slidesFromOutline({
        title: "Фотосинтез",
        slides: [{ heading: "Свет" }, { heading: "Вода" }],
      }),
    ).toEqual([
      { index: 1, heading: "Свет", image: null },
      { index: 2, heading: "Вода", image: null },
    ]);
  });

  it("falls back to numbered slides", () => {
    expect(slidesFromOutline(null, 2)).toEqual([
      { index: 1, heading: "Слайд 1", image: null },
      { index: 2, heading: "Слайд 2", image: null },
    ]);
  });
});

describe("parseSlideImages", () => {
  it("reads local image paths per Slidev slide", () => {
    const md = `---
theme: default
layout: hero
image: /slide-1.jpg
---

# Cover

---
layout: timeline
---

# History

---
layout: image-right
image: /slide-3.jpg
---

# Place
`;
    expect(parseSlideImages(md)).toEqual(["/slide-1.jpg", null, "/slide-3.jpg"]);
  });

  it("ignores remote image URLs", () => {
    const md = `---
image: https://evil.example/x.jpg
---

# Hi
`;
    expect(parseSlideImages(md)).toEqual([null]);
  });
});

describe("withSlideImages", () => {
  it("merges images onto outline slides by index", () => {
    expect(
      withSlideImages(
        [
          { index: 1, heading: "A", image: null },
          { index: 2, heading: "B", image: null },
        ],
        ["/slide-1.jpg"],
      ),
    ).toEqual([
      { index: 1, heading: "A", image: "/slide-1.jpg" },
      { index: 2, heading: "B", image: null },
    ]);
  });
});

describe("outlineTitle", () => {
  it("reads title", () => {
    expect(outlineTitle({ title: " Тема " }, "x")).toBe("Тема");
    expect(outlineTitle({}, "x")).toBe("x");
  });
});

describe("slidesForView", () => {
  const outline = [
    { index: 1, heading: "Hero", image: null },
    { index: 2, heading: "Body", image: null },
    { index: 3, heading: "End", image: null },
  ];
  const md = `---
layout: hero
image: /h.jpg
---

# Hero
`;

  it("truncates to hero-only while progressive (dist is not rebuilt yet)", () => {
    expect(slidesForView({ outlineSlides: outline, markdown: md, progressive: true })).toEqual([
      { index: 1, heading: "Hero", image: "/h.jpg" },
    ]);
  });

  it("ignores slides.md growth while progressive — preview dist is still hero-only", () => {
    const growing = `---
layout: hero
image: /h.jpg
---

# Hero

---
layout: image-right
image: /b.jpg
---

# Body

---
layout: default
---

# End
`;
    expect(slidesForView({ outlineSlides: outline, markdown: growing, progressive: true })).toEqual([
      { index: 1, heading: "Hero", image: "/h.jpg" },
    ]);
  });

  it("returns full deck when not progressive", () => {
    expect(slidesForView({ outlineSlides: outline, markdown: md, progressive: false })).toEqual([
      { index: 1, heading: "Hero", image: "/h.jpg" },
      { index: 2, heading: "Body", image: null },
      { index: 3, heading: "End", image: null },
    ]);
  });
});

