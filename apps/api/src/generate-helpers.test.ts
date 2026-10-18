import { describe, expect, it } from "vitest";
import {
  composeMaxSteps,
  mergeComposeTools,
  pickComposeLayoutTools,
  pickHeroTools,
  pickRewriteTools,
  shouldRunLayoutRenderGate,
  stripComposeInspectTools,
} from "./generate-helpers.js";

describe("composeMaxSteps", () => {
  it("scales with slide count and caps leaner", () => {
    expect(composeMaxSteps(6)).toBe(30);
    expect(composeMaxSteps(8)).toBe(38);
    expect(composeMaxSteps(16)).toBeLessThanOrEqual(48);
  });
});

describe("pickComposeLayoutTools", () => {
  it("keeps layout catalog and drops outline-validate", () => {
    const picked = pickComposeLayoutTools({
      "layout-list": 1,
      "layout-get": 2,
      "layout-match": 3,
      "outline-validate": 4,
      "slidev-insert-slide": 5,
    });
    expect(Object.keys(picked).sort()).toEqual(["layout-get", "layout-list", "layout-match"]);
  });
});

describe("shouldRunLayoutRenderGate", () => {
  it("runs on final builds only", () => {
    expect(shouldRunLayoutRenderGate("preview")).toBe(false);
    expect(shouldRunLayoutRenderGate("progressive")).toBe(false);
    expect(shouldRunLayoutRenderGate("final")).toBe(true);
    expect(shouldRunLayoutRenderGate("final_after_repair")).toBe(true);
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
  it("keeps get/update + layout catalog + assets; drops hero catalog and insert/remove/move", () => {
    const picked = pickRewriteTools({
      "slidev-get-slide": 1,
      "slidev-update-slide": 2,
      "slidev-insert-slide": 3,
      "slidev-remove-slide": 4,
      "slidev-move-slide": 5,
      "slidev-list-slides": 6,
      "slidev-get-info": 7,
      "layout-list": 16,
      "layout-get": 17,
      "layout-match": 18,
      "hero-list": 19,
      "hero-get": 20,
      "upload-image-list": 13,
      "upload-image-search": 14,
      "upload-image-use": 15,
      "yandex-image-search": 8,
      "yandex-image-download": 9,
      "stock-search": 10,
      "stock-download": 11,
      "image-generate": 12,
    });
    expect(Object.keys(picked).sort()).toEqual([
      "image-generate",
      "layout-get",
      "layout-list",
      "layout-match",
      "slidev-get-slide",
      "slidev-update-slide",
      "stock-download",
      "stock-search",
      "upload-image-list",
      "upload-image-search",
      "upload-image-use",
      "yandex-image-download",
      "yandex-image-search",
    ]);
    expect(picked["hero-list"]).toBeUndefined();
    expect(picked["hero-get"]).toBeUndefined();
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
      "upload-image-search": 15,
      "upload-image-use": 16,
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
      "upload-image-search",
      "upload-image-use",
      "yandex-image-search",
    ]);
  });
});
