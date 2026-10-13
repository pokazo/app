import { createHash } from "node:crypto";
import { copyFile, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { parseSlideImages } from "./view-meta.js";

const HASH_LEN = 10;
/** Trailing content hash we append to slide image basenames. */
const VERSION_SUFFIX = /-([a-f0-9]{8,12})$/i;

export function contentHashHex(buf: Buffer | Uint8Array, len = HASH_LEN): string {
  return createHash("md5").update(buf).digest("hex").slice(0, len);
}

/** `slide-4.jpg` + hash → `slide-4-<hash>.jpg`; strips a previous hash suffix first. */
export function versionedImageBasename(filename: string, hash: string): string {
  const base = basename(filename.replace(/^\//, ""));
  const ext = extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  const core = stem.replace(VERSION_SUFFIX, "");
  return `${core}-${hash}${ext}`;
}

export function isVersionedImageBasename(filename: string): boolean {
  const base = basename(filename.replace(/^\//, ""));
  const ext = extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  return VERSION_SUFFIX.test(stem);
}

/** Replace `image:` inside the Nth Slidev frontmatter block (1-based). */
export function replaceNthSlideImage(md: string, slidevIndex: number, nextImage: string): string {
  let n = 0;
  return md.replace(/^---\r?\n([\s\S]*?)\r?\n---/gm, (full, fm: string) => {
    n += 1;
    if (n !== slidevIndex) return full;
    if (!/^image:\s*/m.test(fm)) return full;
    const newFm = fm.replace(/^image:\s*.+$/m, `image: ${nextImage}`);
    return `---\n${newFm}\n---`;
  });
}

/**
 * After rewrite overwrites `/slide-N.jpg`, browsers still show the old bytes when
 * Cache-Control was immutable. Rename the local file to a content-hash basename and
 * update that slide's frontmatter before Slidev build.
 */
export async function bustSlideImageCache(opts: {
  workDir: string;
  /** 1-based Slidev page index. */
  slidevIndex: number;
}): Promise<{ changed: boolean; from?: string; to?: string }> {
  const mdFile = join(opts.workDir, "slides.md");
  const md = await readFile(mdFile, "utf8");
  const images = parseSlideImages(md);
  const current = images[opts.slidevIndex - 1];
  if (!current) return { changed: false };

  const rel = current.replace(/^\//, "");
  const abs = join(opts.workDir, "public", rel);
  let buf: Buffer;
  try {
    buf = await readFile(abs);
  } catch {
    return { changed: false };
  }

  const hash = contentHashHex(buf);
  const nextBase = versionedImageBasename(rel, hash);
  const nextPath = `/${nextBase}`;
  if (nextPath === current) return { changed: false };

  const nextAbs = join(opts.workDir, "public", nextBase);
  try {
    await rename(abs, nextAbs);
  } catch {
    await copyFile(abs, nextAbs);
    try {
      await unlink(abs);
    } catch {
      /* old name may already be gone */
    }
  }

  const updated = replaceNthSlideImage(md, opts.slidevIndex, nextPath);
  if (updated === md) {
    // Roll back rename if we failed to patch md
    try {
      await rename(nextAbs, abs);
    } catch {
      /* keep hashed file */
    }
    return { changed: false };
  }
  await writeFile(mdFile, updated, "utf8");
  return { changed: true, from: current, to: nextPath };
}
