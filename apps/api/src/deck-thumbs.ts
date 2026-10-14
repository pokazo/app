import { createServer, type Server } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, normalize } from "node:path";
import { chromium } from "playwright-chromium";
import sharp from "sharp";
import {
  deckAssetContentType,
  injectPlayerChromeHide,
} from "./player-chrome.js";
import { countDeckSlides } from "./deck-export-render.js";
import { filmstripThumbPath } from "./filmstrip-thumb-path.js";

export { filmstripThumbPath } from "./filmstrip-thumb-path.js";

/** Capture viewport — matches player aspect; then downscale to WebP. */
export const FILMSTRIP_CAPTURE_W = 1280;
export const FILMSTRIP_CAPTURE_H = 720;
/** Filmstrip slot ~176 CSS px; 2× retina → ~360–400. */
export const FILMSTRIP_THUMB_WIDTH = 400;
export const FILMSTRIP_WEBP_QUALITY = 72;

export function filmstripThumbAbs(distDir: string, slidevIndex: number): string {
  return join(distDir, "thumbs", `${Math.max(1, Math.floor(slidevIndex))}.webp`);
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
 * After Slidev build: rasterize each page → small WebP under `dist/thumbs/`.
 * These are the filmstrip images (full slide, not cover photo).
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

export async function renderDeckFilmstripThumbs(opts: {
  workDir: string;
  deckId?: string;
  slideCount?: number;
}): Promise<{ written: number; totalBytes: number; paths: string[]; slides: FilmstripThumbSlide[] }> {
  const dist = join(opts.workDir, "dist");
  if (!existsSync(join(dist, "index.html"))) {
    throw new Error("deck dist not ready for thumbs");
  }
  const deckId = opts.deckId || basename(opts.workDir);
  const slideCount = opts.slideCount ?? (await countDeckSlides(opts.workDir));
  const n = Math.max(1, Math.min(16, Math.floor(slideCount)));
  const outDir = join(dist, "thumbs");
  await mkdir(outDir, { recursive: true });

  const t0 = Date.now();
  const { server, port } = await startDistServer(opts.workDir, deckId);
  const browser = await chromium.launch({ headless: true });
  const paths: string[] = [];
  const slides: FilmstripThumbSlide[] = [];
  let totalBytes = 0;
  try {
    const page = await browser.newPage({
      viewport: { width: FILMSTRIP_CAPTURE_W, height: FILMSTRIP_CAPTURE_H },
      deviceScaleFactor: 1,
    });
    for (let i = 1; i <= n; i++) {
      const url = `http://127.0.0.1:${port}/p/${deckId}/${i}?embedded`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForSelector("#slide-container", { timeout: 30_000 });
      const loading = page.locator(".slidev-slide-loading");
      if ((await loading.count()) > 0) {
        await loading.first().waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
      }
      await new Promise((r) => setTimeout(r, 250));
      const png = Buffer.from(await page.locator("#slide-container").screenshot({ type: "png" }));
      const webp = await sharp(png)
        .resize({ width: FILMSTRIP_THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: FILMSTRIP_WEBP_QUALITY })
        .toBuffer();
      const abs = filmstripThumbAbs(dist, i);
      await writeFile(abs, webp);
      const path = filmstripThumbPath(i);
      paths.push(path);
      slides.push({
        index: i,
        path,
        pngBytes: png.byteLength,
        webpBytes: webp.byteLength,
        capturePng: png,
        webp,
      });
      totalBytes += webp.byteLength;
      console.info(
        `[thumbs] deck=${deckId} slide=${i} capturePng=${png.byteLength}b → webp=${webp.byteLength}b w=${FILMSTRIP_THUMB_WIDTH}`,
      );
    }
  } finally {
    await browser.close().catch(() => {});
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  console.info(
    `[thumbs] deck=${deckId} done slides=${n} totalWebp=${totalBytes}b ms=${Date.now() - t0}`,
  );
  return { written: paths.length, totalBytes, paths, slides };
}

/** Best-effort thumbs after build — never fail the build. */
export async function tryRenderDeckFilmstripThumbs(opts: {
  workDir: string;
  deckId: string;
  slideCount?: number;
}): Promise<void> {
  try {
    await renderDeckFilmstripThumbs(opts);
  } catch (err) {
    console.warn(
      `[thumbs] skipped deck=${opts.deckId}: ${String(err).slice(0, 400)}`,
    );
  }
}
