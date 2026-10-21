import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  backupFilmstripThumbs,
  filmstripRecaptureAfterStructure,
  filmstripThumbBackupDir,
  remapFilmstripThumbs,
  shiftFilmstripThumbsAfterDelete,
  shiftFilmstripThumbsAfterInsert,
  viewIndexMapAfterDelete,
  viewIndexMapAfterInsert,
  viewIndexMapAfterMove,
} from "./filmstrip-thumb-remap.js";

function writeDistThumb(dist: string, n: number, body: string) {
  const dir = join(dist, "thumbs", "v2");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${n}.webp`), body);
}

function readDistThumb(dist: string, n: number): string | null {
  const p = join(dist, "thumbs", "v2", `${n}.webp`);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

describe("viewIndexMapAfterMove", () => {
  it("moves 2 → 4", () => {
    expect(Object.fromEntries(viewIndexMapAfterMove(5, 2, 4))).toEqual({
      1: 1,
      2: 4,
      3: 2,
      4: 3,
      5: 5,
    });
  });

  it("identity when from === to", () => {
    expect(Object.fromEntries(viewIndexMapAfterMove(3, 2, 2))).toEqual({ 1: 1, 2: 2, 3: 3 });
  });
});

describe("viewIndexMapAfterDelete", () => {
  it("deletes 2 and shifts", () => {
    expect(Object.fromEntries(viewIndexMapAfterDelete(4, 2))).toEqual({
      1: 1,
      3: 2,
      4: 3,
    });
  });
});

describe("viewIndexMapAfterInsert", () => {
  it("inserts after 1", () => {
    expect(Object.fromEntries(viewIndexMapAfterInsert(3, 1))).toEqual({
      1: 1,
      2: 3,
      3: 4,
    });
  });
});

describe("backup + remapFilmstripThumbs", () => {
  it("renames files for move 1→3 via backup source", async () => {
    const root = await mkdtemp(join(tmpdir(), "pokazo-thumb-remap-"));
    const dist = join(root, "dist");
    writeDistThumb(dist, 1, "A");
    writeDistThumb(dist, 2, "B");
    writeDistThumb(dist, 3, "C");
    await backupFilmstripThumbs(root, dist, 3);
    // simulate build wipe
    writeFileSync(join(dist, "index.html"), "<html></html>");
    mkdirSync(join(dist, "thumbs", "v2"), { recursive: true });

    const result = await remapFilmstripThumbs({
      sourceDir: filmstripThumbBackupDir(root),
      distDir: dist,
      oldToNew: viewIndexMapAfterMove(3, 1, 3),
    });
    expect(result.ok).toBe(true);
    expect(readDistThumb(dist, 1)).toBe("B");
    expect(readDistThumb(dist, 2)).toBe("C");
    expect(readDistThumb(dist, 3)).toBe("A");
  });

  it("reports missing sources", async () => {
    const root = await mkdtemp(join(tmpdir(), "pokazo-thumb-miss-"));
    const source = join(root, "src");
    mkdirSync(source, { recursive: true });
    writeFileSync(join(source, "1.webp"), "A");
    writeFileSync(join(source, "3.webp"), "C");
    const dist = join(root, "dist");
    const result = await remapFilmstripThumbs({
      sourceDir: source,
      distDir: dist,
      oldToNew: viewIndexMapAfterMove(3, 1, 3),
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain(2);
  });
});

describe("shiftFilmstripThumbsAfterDelete", () => {
  it("drops 2 and shifts 3→2", async () => {
    const root = await mkdtemp(join(tmpdir(), "pokazo-thumb-del-"));
    const source = join(root, "src");
    mkdirSync(source, { recursive: true });
    writeFileSync(join(source, "1.webp"), "A");
    writeFileSync(join(source, "2.webp"), "B");
    writeFileSync(join(source, "3.webp"), "C");
    const dist = join(root, "dist");
    const result = await shiftFilmstripThumbsAfterDelete({
      sourceDir: source,
      distDir: dist,
      deletedIndex: 2,
      oldCount: 3,
    });
    expect(result.ok).toBe(true);
    expect(readDistThumb(dist, 1)).toBe("A");
    expect(readDistThumb(dist, 2)).toBe("C");
    expect(readDistThumb(dist, 3)).toBe(null);
  });
});

describe("shiftFilmstripThumbsAfterInsert", () => {
  it("shifts after 1 and clears new slot 2", async () => {
    const root = await mkdtemp(join(tmpdir(), "pokazo-thumb-ins-"));
    const source = join(root, "src");
    mkdirSync(source, { recursive: true });
    writeFileSync(join(source, "1.webp"), "A");
    writeFileSync(join(source, "2.webp"), "B");
    writeFileSync(join(source, "3.webp"), "C");
    const dist = join(root, "dist");
    const result = await shiftFilmstripThumbsAfterInsert({
      sourceDir: source,
      distDir: dist,
      afterIndex: 1,
      oldCount: 3,
    });
    expect(result.ok).toBe(true);
    expect(result.newIndex).toBe(2);
    expect(readDistThumb(dist, 1)).toBe("A");
    expect(readDistThumb(dist, 2)).toBe(null);
    expect(readDistThumb(dist, 3)).toBe("B");
    expect(readDistThumb(dist, 4)).toBe("C");
  });
});

describe("filmstripRecaptureAfterStructure", () => {
  it("re-shoots every page after a move even when remap reported ok", () => {
    expect(
      filmstripRecaptureAfterStructure({
        newCount: 9,
        remapOk: true,
        missing: [],
      }),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("still recaptures every page after insert, not only the new slot", () => {
    expect(
      filmstripRecaptureAfterStructure({
        newCount: 4,
        remapOk: true,
        missing: [2],
      }),
    ).toEqual([1, 2, 3, 4]);
  });

  it("re-shoots every page after a theme rebuild the same way", () => {
    expect(filmstripRecaptureAfterStructure({ newCount: 6, remapOk: true, missing: [] })).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });
});
