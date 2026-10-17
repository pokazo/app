import { describe, expect, it } from "vitest";
import {
  thumbCoverPath,
  thumbIsSlideShot,
  thumbPlaceholderLayers,
  thumbReactKey,
} from "./deck-thumb-preview";

describe("thumbPlaceholderLayers", () => {
  it("slide screenshot: image only (text already in raster)", () => {
    expect(
      thumbPlaceholderLayers({
        heading: "Что такое фотосинтез",
        imageUrl: "https://api.pokazo.ru/p/x/thumbs/v2/1.webp",
      }),
    ).toEqual({
      showHeading: false,
      showImage: true,
      label: "Что такое фотосинтез",
    });
  });

  it("legacy /thumbs/N.webp is also a slide shot", () => {
    expect(
      thumbPlaceholderLayers({
        heading: "Hero",
        imageUrl: "https://api.pokazo.ru/p/x/thumbs/1.webp",
      }),
    ).toEqual({
      showHeading: false,
      showImage: true,
      label: "Hero",
    });
  });

  it("non-thumb URL is ignored — heading placeholder only", () => {
    const layers = thumbPlaceholderLayers({
      heading: "Что такое фотосинтез",
      imageUrl: "https://api.pokazo.ru/p/x/slide-1.jpg",
    });
    expect(layers.showImage).toBe(false);
    expect(layers.showHeading).toBe(true);
  });

  it("heading-only when no cover image yet", () => {
    expect(
      thumbPlaceholderLayers({ heading: "Этапы", imageUrl: null }),
    ).toEqual({ showHeading: true, showImage: false, label: "Этапы" });
  });
});

describe("thumbCoverPath / thumbIsSlideShot", () => {
  it("uses imageThumb only — never full cover image", () => {
    expect(thumbCoverPath({ imageThumb: "/thumbs/v2/2.webp", image: "/a.jpg" })).toBe(
      "/thumbs/v2/2.webp",
    );
    expect(thumbCoverPath({ imageThumb: null, image: "/a.jpg" })).toBe(null);
  });

  it("detects filmstrip slide shots (v1 and v2)", () => {
    expect(thumbIsSlideShot("/thumbs/1.webp")).toBe(true);
    expect(thumbIsSlideShot("/thumbs/v2/1.webp")).toBe(true);
    expect(thumbIsSlideShot("/slide-1.thumb.webp")).toBe(false);
  });
});

describe("thumb progressive dynamics", () => {
  it("keeps stable React keys across embed cache bumps", () => {
    expect(thumbReactKey(1)).toBe("thumb-1");
    expect([1, 2, 3].map(thumbReactKey)).toEqual(["thumb-1", "thumb-2", "thumb-3"]);
  });
});
