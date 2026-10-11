import { describe, expect, it } from "vitest";
import {
  thumbEmbedSrc,
  thumbPlaceholderLayers,
  thumbReactKey,
  thumbShouldResetReady,
} from "./deck-thumb-preview";

describe("thumbPlaceholderLayers", () => {
  it("reproduces bug: image-only placeholder hides slide text", () => {
    // Old behavior was: !ready && imageUrl → <img> only (no heading).
    // Contract: heading must remain while iframe is not ready.
    const layers = thumbPlaceholderLayers({
      ready: false,
      heading: "Что такое фотосинтез",
      imageUrl: "https://api.pokazo.ru/p/x/slide-1.jpg",
    });
    expect(layers.showImage).toBe(true);
    expect(layers.showHeading).toBe(true);
    expect(layers.label).toBe("Что такое фотосинтез");
  });

  it("heading-only when no cover image yet", () => {
    expect(
      thumbPlaceholderLayers({ ready: false, heading: "Этапы", imageUrl: null }),
    ).toEqual({ showHeading: true, showImage: false, label: "Этапы" });
  });

  it("hides placeholder once iframe is ready", () => {
    expect(
      thumbPlaceholderLayers({
        ready: true,
        heading: "Hero",
        imageUrl: "/slide-1.jpg",
      }),
    ).toEqual({ showHeading: false, showImage: false, label: "Hero" });
  });
});

describe("thumb progressive dynamics", () => {
  it("keeps stable React keys across embed cache bumps (no remount flash)", () => {
    expect(thumbReactKey(1)).toBe("thumb-1");
    expect(thumbReactKey(2)).toBe(thumbReactKey(2));
    // Growing filmstrip: new slide gets new key; old keys unchanged.
    const keys = [1, 2, 3].map(thumbReactKey);
    expect(keys).toEqual(["thumb-1", "thumb-2", "thumb-3"]);
  });

  it("cache-busts iframe src when preview dist rebuilds", () => {
    expect(thumbEmbedSrc("https://api.pokazo.ru/p/abc/", 2, 0)).toBe(
      "https://api.pokazo.ru/p/abc/2?embedded",
    );
    expect(thumbEmbedSrc("https://api.pokazo.ru/p/abc/", 2, 3)).toBe(
      "https://api.pokazo.ru/p/abc/2?embedded&_r=3",
    );
  });

  it("resets ready on cache key change but keeps heading via placeholder layers", () => {
    expect(thumbShouldResetReady(0, 1)).toBe(true);
    expect(thumbShouldResetReady(2, 2)).toBe(false);
    const afterReset = thumbPlaceholderLayers({
      ready: false,
      heading: "Где происходит фотосинтез",
      imageUrl: "/slide-2.jpg",
    });
    expect(afterReset.showHeading).toBe(true);
  });

  it("simulates progressive growth: each new thumb has heading before ready", () => {
    const timeline = [
      [{ index: 1, heading: "Hero", image: "/h.jpg" }],
      [
        { index: 1, heading: "Hero", image: "/h.jpg" },
        { index: 2, heading: "Body", image: "/b.jpg" },
      ],
      [
        { index: 1, heading: "Hero", image: "/h.jpg" },
        { index: 2, heading: "Body", image: "/b.jpg" },
        { index: 3, heading: "End", image: null },
      ],
    ];
    for (const slides of timeline) {
      for (const s of slides) {
        const layers = thumbPlaceholderLayers({
          ready: false,
          heading: s.heading,
          imageUrl: s.image,
        });
        expect(layers.showHeading, `slide ${s.index}`).toBe(true);
        expect(layers.label).toBe(s.heading);
      }
    }
  });
});
