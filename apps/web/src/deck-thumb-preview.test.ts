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
        imageUrl: "https://api.pokazo.ru/p/x/thumbs/1.webp",
      }),
    ).toEqual({
      showHeading: false,
      showImage: true,
      label: "Что такое фотосинтез",
    });
  });

  it("cover photo fallback keeps heading overlay", () => {
    const layers = thumbPlaceholderLayers({
      heading: "Что такое фотосинтез",
      imageUrl: "https://api.pokazo.ru/p/x/slide-1.jpg",
    });
    expect(layers.showImage).toBe(true);
    expect(layers.showHeading).toBe(true);
  });

  it("heading-only when no cover image yet", () => {
    expect(
      thumbPlaceholderLayers({ heading: "Этапы", imageUrl: null }),
    ).toEqual({ showHeading: true, showImage: false, label: "Этапы" });
  });
});

describe("thumbCoverPath / thumbIsSlideShot", () => {
  it("prefers imageThumb over full image", () => {
    expect(thumbCoverPath({ imageThumb: "/thumbs/2.webp", image: "/a.jpg" })).toBe("/thumbs/2.webp");
    expect(thumbCoverPath({ imageThumb: null, image: "/a.jpg" })).toBe("/a.jpg");
  });

  it("detects filmstrip slide shots", () => {
    expect(thumbIsSlideShot("/thumbs/1.webp")).toBe(true);
    expect(thumbIsSlideShot("/slide-1.thumb.webp")).toBe(false);
  });
});

describe("thumb progressive dynamics", () => {
  it("keeps stable React keys across embed cache bumps", () => {
    expect(thumbReactKey(1)).toBe("thumb-1");
    expect([1, 2, 3].map(thumbReactKey)).toEqual(["thumb-1", "thumb-2", "thumb-3"]);
  });
});
