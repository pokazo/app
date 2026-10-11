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

  it("shows only built preview slides while progressive (hero until rebuild)", () => {
    expect(
      slidesForView({
        outlineSlides: outline,
        markdown: md,
        progressive: true,
        builtSlideCount: 1,
      }),
    ).toEqual([{ index: 1, heading: "Hero", image: "/h.jpg" }]);
  });

  it("reproduces bug: md grew but dist still hero → must not list unbuilt slides", () => {
    expect(
      slidesForView({
        outlineSlides: outline,
        markdown: growing,
        progressive: true,
        builtSlideCount: 1,
      }),
    ).toEqual([{ index: 1, heading: "Hero", image: "/h.jpg" }]);
  });

  it("reveals each new page after progressive dist rebuild", () => {
    expect(
      slidesForView({
        outlineSlides: outline,
        markdown: growing,
        progressive: true,
        builtSlideCount: 2,
      }),
    ).toEqual([
      { index: 1, heading: "Hero", image: "/h.jpg" },
      { index: 2, heading: "Body", image: "/b.jpg" },
    ]);
    expect(
      slidesForView({
        outlineSlides: outline,
        markdown: growing,
        progressive: true,
        builtSlideCount: 3,
      }),
    ).toEqual([
      { index: 1, heading: "Hero", image: "/h.jpg" },
      { index: 2, heading: "Body", image: "/b.jpg" },
      { index: 3, heading: "End", image: null },
    ]);
  });

  it("defaults progressive to hero-only when builtSlideCount omitted", () => {
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

