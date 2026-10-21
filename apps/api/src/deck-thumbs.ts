import { createServer, type Server } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, normalize } from "node:path";
import { chromium, type Browser, type Page } from "playwright-chromium";
import {
  deckAssetContentType,
  injectPlayerChromeHide,
} from "./player-chrome.js";
import { countDeckSlides } from "./deck-export-render.js";
import { filmstripThumbPathV2 } from "./filmstrip-thumb-path.js";
import { filmstripRecaptureAfterStructure } from "./filmstrip-thumb-remap.js";
import {
  FILMSTRIP_CAPTURE_H,
  FILMSTRIP_CAPTURE_READY_SELECTOR,
  FILMSTRIP_CAPTURE_SELECTOR,
  FILMSTRIP_CAPTURE_W,
  FILMSTRIP_THUMB_WIDTH,
  FILMSTRIP_WEBP_QUALITY,
  pngToFilmstripWebp,
} from "./slide-capture.js";

export { filmstripThumbPath, filmstripThumbPathV2 } from "./filmstrip-thumb-path.js";
export {
  FILMSTRIP_CAPTURE_H,
  FILMSTRIP_CAPTURE_W,
  FILMSTRIP_THUMB_WIDTH,
  FILMSTRIP_WEBP_QUALITY,
} from "./slide-capture.js";

/** Legacy v1 abs path — kept for readers; new builds do not write here. */
export function filmstripThumbAbs(distDir: string, slidevIndex: number): string {
  return join(distDir, "thumbs", `${Math.max(1, Math.floor(slidevIndex))}.webp`);
}

/** v2 abs path under dist/thumbs/v2/{N}.webp */
export function filmstripThumbAbsV2(distDir: string, slidevIndex: number): string {
  return join(distDir, "thumbs", "v2", `${Math.max(1, Math.floor(slidevIndex))}.webp`);
}

/** 1-based indices in `1..slideCount` that have no v2 WebP on disk. */
export function missingFilmstripThumbIndices(distDir: string, slideCount: number): number[] {
  const n = Math.max(0, Math.min(16, Math.floor(slideCount)));
  const missing: number[] = [];
  for (let i = 1; i <= n; i++) {
    if (!existsSync(filmstripThumbAbsV2(distDir, i))) missing.push(i);
  }
  return missing;
}

function startDistServer(workDir: string, deckId: string): Promise<{ server: Server; port: number }> {
  const dist = join(workDir, "dist");
  const prefix = `/p/${deckId}/`;
  const server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url || "/", "http://127.0.0.1");
      if (!u.pathname.startsWith(prefix)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      let rel = decodeURIComponent(u.pathname.slice(prefix.length)) || "index.html";
      if (rel.endsWith("/")) rel += "index.html";
      let file = normalize(join(dist, rel));
      if (!file.startsWith(normalize(dist))) {
        res.writeHead(403);
        res.end("no");
        return;
      }
      if (!existsSync(file) || /^\d+/.test(rel)) {
        file = join(dist, "index.html");
      }
      let body: Buffer | string = await readFile(file);
      const ext = extname(file);
      if (ext === ".html") {
        body = injectPlayerChromeHide(body.toString("utf8"));
      }
      res.writeHead(200, { "content-type": deckAssetContentType(ext) });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("missing");
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("no listen port"));
        return;
      }
      resolve({ server, port: addr.port });
    });
  });
}

/**
 * After Slidev build: rasterize each page → small WebP under `dist/thumbs/v2/`.
 * These are the filmstrip images (full slide, not cover photo).
 * Legacy `dist/thumbs/{N}.webp` is left untouched.
 */
export type FilmstripThumbSlide = {
  index: number;
  path: string;
  pngBytes: number;
  webpBytes: number;
  /** Raw capture PNG before WebP downscale (for size-compare goldens). */
  capturePng: Buffer;
  webp: Buffer;
};

async function captureSlideThumb(opts: {
  page: Page;
  port: number;
  deckId: string;
  dist: string;
  index: number;
}): Promise<FilmstripThumbSlide> {
  const { page, port, deckId, dist, index } = opts;
  const url = `http://127.0.0.1:${port}/p/${deckId}/${index}?embedded`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector(FILMSTRIP_CAPTURE_READY_SELECTOR, { timeout: 30_000 });
  await page.waitForSelector(FILMSTRIP_CAPTURE_SELECTOR, { timeout: 30_000 });
  const loading = page.locator(".slidev-slide-loading");
  if ((await loading.count()) > 0) {
    await loading.first().waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
  }
  await new Promise((r) => setTimeout(r, 250));
  const png = Buffer.from(await page.locator(FILMSTRIP_CAPTURE_SELECTOR).screenshot({ type: "png" }));
  const webp = await pngToFilmstripWebp(png);
  const abs = filmstripThumbAbsV2(dist, index);
  await writeFile(abs, webp);
  const path = filmstripThumbPathV2(index);
  console.info(
    `[thumbs] deck=${deckId} slide=${index} capturePng=${png.byteLength}b → webp=${webp.byteLength}b w=${FILMSTRIP_THUMB_WIDTH}`,
  );
  return {
    index,
    path,
    pngBytes: png.byteLength,
    webpBytes: webp.byteLength,
    capturePng: png,
    webp,
  };
}

async function withThumbBrowser<T>(
  workDir: string,
  deckId: string,
  fn: (ctx: { page: Page; port: number; browser: Browser; dist: string }) => Promise<T>,
): Promise<T> {
  const dist = join(workDir, "dist");
  const { server, port } = await startDistServer(workDir, deckId);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: FILMSTRIP_CAPTURE_W, height: FILMSTRIP_CAPTURE_H },
      deviceScaleFactor: 1,
    });
    return await fn({ page, port, browser, dist });
  } finally {
    await browser.close().catch(() => {});
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/**
 * Write filmstrip WebPs for every slide (or only `indices`).
 * Each slide is isolated: one failure does not skip the rest.
 * Missing slides are retried once in a fresh browser session.
 * Throws if any required WebP is still absent after retry.
 */
export async function renderDeckFilmstripThumbs(opts: {
  workDir: string;
  deckId?: string;
  slideCount?: number;
  /** When set, only these 1-based indices are (re)captured. */
  indices?: number[];
}): Promise<{ written: number; totalBytes: number; paths: string[]; slides: FilmstripThumbSlide[] }> {
  const dist = join(opts.workDir, "dist");
  if (!existsSync(join(dist, "index.html"))) {
    throw new Error("deck dist not ready for thumbs");
  }
  const deckId = opts.deckId || basename(opts.workDir);
  const slideCount = opts.slideCount ?? (await countDeckSlides(opts.workDir));
  const n = Math.max(1, Math.min(16, Math.floor(slideCount)));
  const targets =
    opts.indices?.filter((i) => Number.isInteger(i) && i >= 1 && i <= n) ??
    Array.from({ length: n }, (_, i) => i + 1);
  if (!targets.length) {
    return { written: 0, totalBytes: 0, paths: [], slides: [] };
  }
  await mkdir(join(dist, "thumbs", "v2"), { recursive: true });

  const t0 = Date.now();
  const byIndex = new Map<number, FilmstripThumbSlide>();

  const runPass = async (indices: number[]) => {
    if (!indices.length) return;
    await withThumbBrowser(opts.workDir, deckId, async ({ page, port, dist: d }) => {
      for (const i of indices) {
        try {
          const slide = await captureSlideThumb({ page, port, deckId, dist: d, index: i });
          byIndex.set(i, slide);
        } catch (err) {
          console.warn(
            `[thumbs] deck=${deckId} slide=${i} failed: ${String(err).slice(0, 300)}`,
          );
        }
      }
    });
  };

  await runPass(targets);
  const missingAfterFirst = targets.filter((i) => !existsSync(filmstripThumbAbsV2(dist, i)));
  if (missingAfterFirst.length) {
    console.warn(
      `[thumbs] deck=${deckId} retry missing=${missingAfterFirst.join(",")}`,
    );
    await runPass(missingAfterFirst);
  }

  const stillMissing = targets.filter((i) => !existsSync(filmstripThumbAbsV2(dist, i)));
  if (stillMissing.length) {
    throw new Error(`thumbs incomplete: ${stillMissing.join(",")}`);
  }

  const slides = targets.map((i) => byIndex.get(i)!).filter(Boolean);
  const paths = slides.map((s) => s.path);
  const totalBytes = slides.reduce((sum, s) => sum + s.webpBytes, 0);
  console.info(
    `[thumbs] deck=${deckId} done slides=${targets.length} totalWebp=${totalBytes}b ms=${Date.now() - t0}`,
  );
  return { written: slides.length, totalBytes, paths, slides };
}

/**
 * Ensure every slide `1..slideCount` has a v2 WebP on disk.
 * Captures only missing indices (full pass if none exist yet).
 */
export async function ensureDeckFilmstripThumbs(opts: {
  workDir: string;
  deckId: string;
  slideCount?: number;
}): Promise<{ missingBefore: number[]; written: number }> {
  const dist = join(opts.workDir, "dist");
  if (!existsSync(join(dist, "index.html"))) {
    throw new Error("deck dist not ready for thumbs");
  }
  const slideCount = opts.slideCount ?? (await countDeckSlides(opts.workDir));
  const n = Math.max(1, Math.min(16, Math.floor(slideCount)));
  const missingBefore = missingFilmstripThumbIndices(dist, n);
  if (!missingBefore.length) return { missingBefore, written: 0 };
  const result = await renderDeckFilmstripThumbs({
    workDir: opts.workDir,
    deckId: opts.deckId,
    slideCount: n,
    indices: missingBefore,
  });
  return { missingBefore, written: result.written };
}

/**
 * Re-shoot every filmstrip page from the current dist player.
 * Slot-numbered WebPs are a cache, not a second deck order.
 */
export async function recaptureAllFilmstripThumbs(opts: {
  workDir: string;
  deckId: string;
  slideCount?: number;
}): Promise<{ written: number; paths: string[] }> {
  const slideCount = opts.slideCount ?? (await countDeckSlides(opts.workDir));
  const indices = filmstripRecaptureAfterStructure({ newCount: slideCount });
  const result = await renderDeckFilmstripThumbs({
    workDir: opts.workDir,
    deckId: opts.deckId,
    slideCount,
    indices,
  });
  return { written: result.written, paths: result.paths };
}

/** Best-effort thumbs after build — never fail the build; still fill gaps when possible. */
export async function tryRenderDeckFilmstripThumbs(opts: {
  workDir: string;
  deckId: string;
  slideCount?: number;
}): Promise<void> {
  try {
    await ensureDeckFilmstripThumbs(opts);
  } catch (err) {
    console.warn(
      `[thumbs] incomplete deck=${opts.deckId}: ${String(err).slice(0, 400)}`,
    );
    try {
      await renderDeckFilmstripThumbs(opts);
    } catch (err2) {
      console.warn(
        `[thumbs] skipped deck=${opts.deckId}: ${String(err2).slice(0, 400)}`,
      );
    }
  }
}
