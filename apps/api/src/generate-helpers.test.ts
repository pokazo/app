import { describe, expect, it } from "vitest";
import {
  composeMaxSteps,
  mergeComposeTools,
  pickHeroTools,
  pickRewriteTools,
  stripComposeInspectTools,
} from "./generate-helpers.js";

describe("composeMaxSteps", () => {
  it("scales with slide count and caps leaner", () => {
    expect(composeMaxSteps(6)).toBe(30);
    expect(composeMaxSteps(8)).toBe(38);
    expect(composeMaxSteps(16)).toBeLessThanOrEqual(48);
  });
});

describe("mergeComposeTools", () => {
  it("merges slidev, yandex, stock, and image-gen tool maps", () => {
    const merged = mergeComposeTools(
      { "slidev-list-slides": { a: 1 } },
      { "yandex-image-search": { y: 1 }, "yandex-image-download": { z: 2 } },
      { "stock-search": { b: 2 }, "stock-download": { c: 3 } },
      { "image-generate": { d: 4 } },
    );
    expect(Object.keys(merged).sort()).toEqual([
      "image-generate",
      "slidev-list-slides",
      "stock-download",
      "stock-search",
      "yandex-image-download",
      "yandex-image-search",
    ]);
  });
});

describe("stripComposeInspectTools", () => {
  it("stubs get-info/get-slide execute and keeps list/insert", async () => {
    const picked = stripComposeInspectTools({
      "slidev-get-info": {
        description: "info",
        execute: async () => ({ ok: true }),
      },
      "slidev-get-slide": {
        description: "slide",
        execute: async () => ({ ok: true }),
      },
      "slidev-list-slides": { description: "list", execute: async () => ({ n: 1 }) },
      "slidev-insert-slide": 4,
    });
    expect(picked["slidev-list-slides"]).toBeTruthy();
    expect(picked["slidev-insert-slide"]).toBe(4);
    const info = picked["slidev-get-info"] as {
      execute: () => Promise<{ error?: string }>;
      description: string;
    };
    const out = await info.execute();
    expect(out.error).toMatch(/inspect disabled/i);
    expect(info.description).toMatch(/DISABLED/i);
  });
});

describe("pickRewriteTools", () => {
  it("keeps get/update + assets and drops insert/remove/move/list", () => {
    const picked = pickRewriteTools({
      "slidev-get-slide": 1,
      "slidev-update-slide": 2,
      "slidev-insert-slide": 3,
      "slidev-remove-slide": 4,
      "slidev-move-slide": 5,
      "slidev-list-slides": 6,
      "slidev-get-info": 7,
      "yandex-image-search": 8,
      "yandex-image-download": 9,
      "stock-search": 10,
      "stock-download": 11,
      "image-generate": 12,
    });
    expect(Object.keys(picked).sort()).toEqual([
      "image-generate",
      "slidev-get-slide",
      "slidev-update-slide",
      "stock-download",
      "stock-search",
      "yandex-image-download",
      "yandex-image-search",
    ]);
  });
});

describe("pickHeroTools", () => {
  it("keeps hero catalog + update + assets and drops inspect/insert/remove/move", () => {
    const picked = pickHeroTools({
      "hero-list": 11,
      "hero-get": 12,
      "layout-list": 13,
      "layout-get": 14,
      "slidev-update-slide": 1,
      "slidev-insert-slide": 2,
      "slidev-remove-slide": 3,
      "slidev-move-slide": 4,
      "slidev-list-slides": 5,
      "slidev-get-info": 9,
      "slidev-get-slide": 10,
      "yandex-image-search": 8,
      "stock-search": 6,
      "image-generate": 7,
    });
    expect(Object.keys(picked).sort()).toEqual([
      "hero-get",
      "hero-list",
      "image-generate",
      "slidev-update-slide",
      "stock-search",
      "yandex-image-search",
    ]);
  });
});
