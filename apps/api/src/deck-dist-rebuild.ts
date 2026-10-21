/**
 * Refresh `dist/` when slides.md is newer, so the viewer iframe can stay on the
 * built player. Slidev dev is not a substitute: a cold refresh pulls hundreds of
 * uncached modules before the slide paints.
 */
import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  backupFilmstripThumbs,
  filmstripThumbBackupDir,
  remapFilmstripThumbs,
} from "./filmstrip-thumb-remap.js";
import { buildSlidev, deckServeBase } from "./slidev.js";
import { deckDistBehindMarkdown, stopSlidevDev } from "./slidev-dev-pool.js";

const inflight = new Map<string, Promise<void>>();

export async function rebuildStaleDeckDist(deckId: string, workDir: string): Promise<void> {
  if (!deckDistBehindMarkdown(workDir)) return;
  const existing = inflight.get(deckId);
  if (existing) return existing;
  const job = rebuild(deckId, workDir).finally(() => {
    inflight.delete(deckId);
  });
  inflight.set(deckId, job);
  return job;
}

async function rebuild(deckId: string, workDir: string): Promise<void> {
  if (!deckDistBehindMarkdown(workDir)) return;
  await stopSlidevDev(deckId);
  const distDir = join(workDir, "dist");
  await backupFilmstripThumbs(workDir, distDir, 16);
  const t0 = Date.now();
  await buildSlidev(workDir, deckServeBase(deckId));
  await restoreThumbBackup(workDir, distDir);
  await unlink(join(workDir, ".live-dirty")).catch(() => {});
  console.info(`[dist] rebuilt stale player deck=${deckId} ms=${Date.now() - t0}`);
}

/** `slidev build` empties dist, including filmstrip shots. Put the backup back. */
async function restoreThumbBackup(workDir: string, distDir: string): Promise<void> {
  const sourceDir = filmstripThumbBackupDir(workDir);
  let names: string[] = [];
  try {
    names = await readdir(sourceDir);
  } catch {
    return;
  }
  const oldToNew = new Map<number, number>();
  for (const name of names) {
    const m = /^(\d+)\.webp$/.exec(name);
    if (!m) continue;
    const n = Number(m[1]);
    if (n >= 1) oldToNew.set(n, n);
  }
  if (oldToNew.size < 1) return;
  await remapFilmstripThumbs({ sourceDir, distDir, oldToNew });
}
