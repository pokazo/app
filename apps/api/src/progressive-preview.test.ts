import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  composeStepMayChangeDeck,
  parsePreviewBuild,
  readPreviewBuild,
  shouldRebuildProgressivePreview,
  writePreviewBuild,
} from "./progressive-preview.js";

describe("parsePreviewBuild", () => {
  it("defaults to 1", () => {
    expect(parsePreviewBuild(null)).toEqual({ builtSlideCount: 1 });
    expect(parsePreviewBuild({})).toEqual({ builtSlideCount: 1 });
    expect(parsePreviewBuild({ builtSlideCount: 0 })).toEqual({ builtSlideCount: 1 });
  });

  it("reads positive integer", () => {
    expect(parsePreviewBuild({ builtSlideCount: 3 })).toEqual({ builtSlideCount: 3 });
  });
});

describe("shouldRebuildProgressivePreview", () => {
  it("reproduces hero-then-pause: md grows past built hero, needs rebuild", () => {
    expect(shouldRebuildProgressivePreview(1, 1)).toBe(false);
    expect(shouldRebuildProgressivePreview(2, 1)).toBe(true);
    expect(shouldRebuildProgressivePreview(4, 2)).toBe(true);
    expect(shouldRebuildProgressivePreview(3, 3)).toBe(false);
  });
});

describe("composeStepMayChangeDeck", () => {
  it("detects slidev mutating tools", () => {
    expect(composeStepMayChangeDeck(["yandex-image-search"])).toBe(false);
    expect(composeStepMayChangeDeck(["slidev-insert-slide"])).toBe(true);
    expect(composeStepMayChangeDeck(["slidev-update-slide", "stock-download"])).toBe(true);
  });
});

describe("preview-build.json roundtrip", () => {
  it("persists built slide count for /api/view", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pk-preview-"));
    await writePreviewBuild(dir, { builtSlideCount: 4 });
    expect(JSON.parse(await readFile(join(dir, "preview-build.json"), "utf8"))).toEqual({
      builtSlideCount: 4,
    });
    expect(await readPreviewBuild(dir)).toEqual({ builtSlideCount: 4 });
  });
});
