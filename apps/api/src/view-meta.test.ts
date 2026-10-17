import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  outlineTitle,
  parseSlideImages,
  slidesForView,
  slidesFromOutline,
  withImageThumbs,
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
      { index: 1, heading: "Свет", image: null, imageThumb: null, slidevIndex: 1 },
      { index: 2, heading: "Вода", image: null, imageThumb: null, slidevIndex: 2 },
    ]);
  });

  it("falls back to numbered slides", () => {
    expect(slidesFromOutline(null, 2)).toEqual([
      { index: 1, heading: "Слайд 1", image: null, imageThumb: null, slidevIndex: 1 },
      { index: 2, heading: "Слайд 2", image: null, imageThumb: null, slidevIndex: 2 },
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

describe("withImageThumbs", () => {
  it("prefers /thumbs/v2/N.webp over legacy /thumbs/N.webp", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-view-thumb-"));
    await mkdir(join(dir, "dist", "thumbs", "v2"), { recursive: true });
    await writeFile(join(dir, "dist", "thumbs", "v2", "1.webp"), Buffer.from("v2"));
    await writeFile(join(dir, "dist", "thumbs", "1.webp"), Buffer.from("v1"));
    await writeFile(join(dir, "dist", "slide-1.thumb.webp"), Buffer.from("cover"));
    const slides = withImageThumbs(
      [
        { index: 1, heading: "A", image: "/slide-1.jpg", imageThumb: null, slidevIndex: 1 },
        { index: 2, heading: "B", image: "/slide-2.jpg", imageThumb: null, slidevIndex: 2 },
      ],
      join(dir, "dist"),
    );
    expect(slides[0]?.imageThumb).toBe("/thumbs/v2/1.webp");
    expect(slides[1]?.imageThumb).toBe(null);
  });

  it("falls back to legacy /thumbs/N.webp when v2 missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-view-thumb-v1-"));
    await mkdir(join(dir, "dist", "thumbs"), { recursive: true });
    await writeFile(join(dir, "dist", "thumbs", "1.webp"), Buffer.from("v1"));
    const slides = withImageThumbs(
      [{ index: 1, heading: "A", image: "/slide-1.jpg", imageThumb: null, slidevIndex: 1 }],
      join(dir, "dist"),
    );
    expect(slides[0]?.imageThumb).toBe("/thumbs/1.webp");
  });

  it("does not use cover .thumb.webp — null until slide shot exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-view-cover-"));
    await mkdir(join(dir, "dist"), { recursive: true });
    await writeFile(join(dir, "dist", "slide-1.thumb.webp"), Buffer.from("x"));
    const slides = withImageThumbs(
      [{ index: 1, heading: "A", image: "/slide-1.jpg", imageThumb: null, slidevIndex: 1 }],
      join(dir, "dist"),
    );
    expect(slides[0]?.imageThumb).toBe(null);
  });
});

describe("withSlideImages", () => {
  it("merges images onto outline slides by index", () => {
    expect(
      withSlideImages(
        [
          { index: 1, heading: "A", image: null, imageThumb: null, slidevIndex: 1 },
          { index: 2, heading: "B", image: null, imageThumb: null, slidevIndex: 2 },
        ],
        ["/slide-1.jpg"],
      ),
    ).toEqual([
      { index: 1, heading: "A", image: "/slide-1.jpg", imageThumb: null, slidevIndex: 1 },
      { index: 2, heading: "B", image: null, imageThumb: null, slidevIndex: 2 },
    ]);
  });

  it("skips orphan leading hero image when md has outlineCount+1 slides", () => {
    expect(
      withSlideImages(
        [
          { index: 1, heading: "Timeline", image: null, imageThumb: null, slidevIndex: 1 },
          { index: 2, heading: "Features", image: null, imageThumb: null, slidevIndex: 2 },
          { index: 3, heading: "Songs", image: null, imageThumb: null, slidevIndex: 3 },
        ],
        ["/hero.jpg", null, null, "/slide-4.jpg"],
        { mdImageOffset: 1 },
      ),
    ).toEqual([
      { index: 1, heading: "Timeline", image: null, imageThumb: null, slidevIndex: 2 },
      { index: 2, heading: "Features", image: null, imageThumb: null, slidevIndex: 3 },
      { index: 3, heading: "Songs", image: "/slide-4.jpg", imageThumb: null, slidevIndex: 4 },
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
    { index: 1, heading: "Hero", image: null, imageThumb: null, slidevIndex: 1 },
    { index: 2, heading: "Body", image: null, imageThumb: null, slidevIndex: 2 },
    { index: 3, heading: "End", image: null, imageThumb: null, slidevIndex: 3 },
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
    ).toEqual([{ index: 1, heading: "Hero", image: "/h.jpg", imageThumb: null, slidevIndex: 1 }]);
  });

  it("reproduces bug: md grew but dist still hero → must not list unbuilt slides", () => {
    expect(
      slidesForView({
        outlineSlides: outline,
        markdown: growing,
        progressive: true,
        builtSlideCount: 1,
      }),
    ).toEqual([{ index: 1, heading: "Hero", image: "/h.jpg", imageThumb: null, slidevIndex: 1 }]);
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
      { index: 1, heading: "Hero", image: "/h.jpg", imageThumb: null, slidevIndex: 1 },
      { index: 2, heading: "Body", image: "/b.jpg", imageThumb: null, slidevIndex: 2 },
    ]);
    expect(
      slidesForView({
        outlineSlides: outline,
        markdown: growing,
        progressive: true,
        builtSlideCount: 3,
      }),
    ).toEqual([
      { index: 1, heading: "Hero", image: "/h.jpg", imageThumb: null, slidevIndex: 1 },
      { index: 2, heading: "Body", image: "/b.jpg", imageThumb: null, slidevIndex: 2 },
      { index: 3, heading: "End", image: null, imageThumb: null, slidevIndex: 3 },
    ]);
  });

  it("defaults progressive to hero-only when builtSlideCount omitted", () => {
    expect(slidesForView({ outlineSlides: outline, markdown: growing, progressive: true })).toEqual([
      { index: 1, heading: "Hero", image: "/h.jpg", imageThumb: null, slidevIndex: 1 },
    ]);
  });

  it("returns full deck when not progressive", () => {
    expect(
      slidesForView({ outlineSlides: outline, markdown: growing, progressive: false }),
    ).toEqual([
      { index: 1, heading: "Hero", image: "/h.jpg", imageThumb: null, slidevIndex: 1 },
      { index: 2, heading: "Body", image: "/b.jpg", imageThumb: null, slidevIndex: 2 },
      { index: 3, heading: "End", image: null, imageThumb: null, slidevIndex: 3 },
    ]);
  });

  it("clamps ready view to md when outline is ahead of slides.md", () => {
    expect(slidesForView({ outlineSlides: outline, markdown: md, progressive: false })).toEqual([
      { index: 1, heading: "Hero", image: "/h.jpg", imageThumb: null, slidevIndex: 1 },
    ]);
  });

  it("keeps orphan leading hero as slide 1, then outline body slides", () => {
    const bodyOutline = [
      { index: 1, heading: "История", image: null, imageThumb: null, slidevIndex: 1 },
      { index: 2, heading: "Успех", image: null, imageThumb: null, slidevIndex: 2 },
      { index: 3, heading: "Песни", image: null, imageThumb: null, slidevIndex: 3 },
    ];
    const orphanHero = `---
layout: hero
image: /hero.jpg
---

# Cover

---
layout: timeline
---

# История

---
layout: features
---

# Успех

---
layout: image-left
image: /songs.jpg
---

# Песни
`;
    expect(
      slidesForView({ outlineSlides: bodyOutline, markdown: orphanHero, progressive: false }),
    ).toEqual([
      { index: 1, heading: "Cover", image: "/hero.jpg", imageThumb: null, slidevIndex: 1 },
      { index: 2, heading: "История", image: null, imageThumb: null, slidevIndex: 2 },
      { index: 3, heading: "Успех", image: null, imageThumb: null, slidevIndex: 3 },
      { index: 4, heading: "Песни", image: "/songs.jpg", imageThumb: null, slidevIndex: 4 },
    ]);
  });
});

