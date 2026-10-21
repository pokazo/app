import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

function thumbAbsV2(distDir: string, slidevIndex: number): string {
  return join(distDir, "thumbs", "v2", `${Math.max(1, Math.floor(slidevIndex))}.webp`);
}

/** Side cache outside `dist` (slidev build empties outDir). */
export function filmstripThumbBackupDir(workDir: string): string {
  return join(workDir, ".filmstrip-thumbs");
}

/**
 * Old view index (1-based) → new view index after moving `from` to `to`.
 */
export function viewIndexMapAfterMove(
  count: number,
  from: number,
  to: number,
): Map<number, number> {
  const n = Math.max(0, Math.floor(count));
  const map = new Map<number, number>();
  if (n < 1 || from < 1 || from > n || to < 1 || to > n) return map;
  if (from === to) {
    for (let i = 1; i <= n; i++) map.set(i, i);
    return map;
  }
  const order = Array.from({ length: n }, (_, i) => i + 1);
  const [moved] = order.splice(from - 1, 1);
  if (moved == null) return map;
  order.splice(to - 1, 0, moved);
  for (let newIdx = 1; newIdx <= order.length; newIdx++) {
    map.set(order[newIdx - 1]!, newIdx);
  }
  return map;
}

/** Old view index → new after deleting `deleted` (1-based). Deleted key absent. */
export function viewIndexMapAfterDelete(count: number, deleted: number): Map<number, number> {
  const n = Math.max(0, Math.floor(count));
  const map = new Map<number, number>();
  if (n < 1 || deleted < 1 || deleted > n) return map;
  for (let i = 1; i <= n; i++) {
    if (i === deleted) continue;
    map.set(i, i < deleted ? i : i - 1);
  }
  return map;
}

/**
 * Old view index → new after inserting after `after` (1-based).
 * New slot at `after + 1` has no old index.
 */
export function viewIndexMapAfterInsert(count: number, after: number): Map<number, number> {
  const n = Math.max(0, Math.floor(count));
  const map = new Map<number, number>();
  if (n < 1 || after < 1 || after > n) return map;
  for (let i = 1; i <= n; i++) {
    map.set(i, i <= after ? i : i + 1);
  }
  return map;
}

/** Copy `dist/thumbs/v2/*.webp` → `workDir/.filmstrip-thumbs/` before slidev build wipes dist. */
export async function backupFilmstripThumbs(
  workDir: string,
  distDir: string,
  slideCount: number,
): Promise<number> {
  const backup = filmstripThumbBackupDir(workDir);
  await mkdir(backup, { recursive: true });
  for (const name of await readdir(backup).catch(() => [] as string[])) {
    if (name.endsWith(".webp")) await unlink(join(backup, name)).catch(() => {});
  }
  let copied = 0;
  const n = Math.max(0, Math.min(16, Math.floor(slideCount)));
  for (let i = 1; i <= n; i++) {
    const src = thumbAbsV2(distDir, i);
    if (!existsSync(src)) continue;
    await copyFile(src, join(backup, `${i}.webp`));
    copied++;
  }
  return copied;
}

/**
 * Write remapped thumbs from backup into dist/thumbs/v2.
 * `oldToNew`: old index → new index.
 */
export async function remapFilmstripThumbs(opts: {
  sourceDir: string;
  distDir: string;
  oldToNew: Map<number, number>;
}): Promise<{ ok: boolean; missing: number[] }> {
  const { sourceDir, distDir, oldToNew } = opts;
  const missing: number[] = [];
  if (oldToNew.size < 1) return { ok: true, missing };

  const outDir = join(distDir, "thumbs", "v2");
  await mkdir(outDir, { recursive: true });

  for (const [oldIdx, newIdx] of oldToNew) {
    const src = join(sourceDir, `${oldIdx}.webp`);
    if (!existsSync(src)) {
      missing.push(oldIdx);
      continue;
    }
    await copyFile(src, join(outDir, `${newIdx}.webp`));
  }
  if (missing.length) return { ok: false, missing };
  return { ok: true, missing: [] };
}

export async function shiftFilmstripThumbsAfterDelete(opts: {
  sourceDir: string;
  distDir: string;
  deletedIndex: number;
  oldCount: number;
}): Promise<{ ok: boolean; missing: number[] }> {
  return remapFilmstripThumbs({
    sourceDir: opts.sourceDir,
    distDir: opts.distDir,
    oldToNew: viewIndexMapAfterDelete(opts.oldCount, opts.deletedIndex),
  });
}

export async function shiftFilmstripThumbsAfterInsert(opts: {
  sourceDir: string;
  distDir: string;
  afterIndex: number;
  oldCount: number;
}): Promise<{ ok: boolean; missing: number[]; newIndex: number }> {
  const newIndex = opts.afterIndex + 1;
  const result = await remapFilmstripThumbs({
    sourceDir: opts.sourceDir,
    distDir: opts.distDir,
    oldToNew: viewIndexMapAfterInsert(opts.oldCount, opts.afterIndex),
  });
  const neu = thumbAbsV2(opts.distDir, newIndex);
  if (existsSync(neu)) await unlink(neu).catch(() => {});
  return { ...result, newIndex };
}

/** Refresh backup from dist after a successful structure op. */
export async function syncFilmstripThumbBackup(
  workDir: string,
  distDir: string,
  slideCount: number,
): Promise<void> {
  await backupFilmstripThumbs(workDir, distDir, slideCount);
}

/**
 * Pages to re-shoot after a structure build.
 * Remap can copy a stale backup (filmstrip then shows the next slide).
 * The built player is the source of truth — recapture every page, even
 * when remap reported ok and no files are missing.
 */
export function filmstripRecaptureAfterStructure(opts: {
  newCount: number;
  remapOk?: boolean;
  missing?: number[];
}): number[] {
  void opts.remapOk;
  void opts.missing;
  const n = Math.max(0, Math.min(16, Math.floor(opts.newCount)));
  return Array.from({ length: n }, (_, i) => i + 1);
}

/** Test helper. */
export async function writeFakeThumb(dir: string, n: number, body: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${n}.webp`), body);
}
