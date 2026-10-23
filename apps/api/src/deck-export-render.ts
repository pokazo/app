import { createServer, type Server } from "node:http";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, normalize } from "node:path";
import { chromium } from "playwright-chromium";
import {
  deckAssetContentType,
  injectPlayerChromeHide,
} from "./player-chrome.js";
import { pptxFromPngs } from "./pptx-images.js";
import { maxViewSlideCount } from "./rewrite-lock.js";
import type { SlidevExportFormat } from "./slidev.js";
import { countSlidesInMarkdown } from "./view-meta.js";

const SLIDE_W = 1920;
const SLIDE_H = 1080;

/**
 * Slidev pages the player lists.
 * Outline length alone drops the extra leading hero: view shows outline+1,
 * and a rewrite rebuild then never shoots that last filmstrip thumb.
 */
export async function countDeckSlides(workDir: string): Promise<number> {
  let outlineCount = 0;
  try {
    const outline = JSON.parse(await readFile(join(workDir, "outline.json"), "utf8")) as {
      slides?: unknown[];
    };
    if (Array.isArray(outline.slides)) outlineCount = outline.slides.length;
  } catch {
    /* no outline */
  }

  let md = "";
  try {
    md = await readFile(join(workDir, "slides.md"), "utf8");
  } catch {
    /* no markdown */
  }

  if (md.trim()) {
    const mdCount = countSlidesInMarkdown(md);
    if (outlineCount > 0) {
      const view = maxViewSlideCount(md, outlineCount);
      if (mdCount > 0 && view > mdCount) return mdCount;
      return Math.max(1, view);
    }
    return Math.max(1, mdCount);
  }

  if (outlineCount > 0) return outlineCount;
  return 1;
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

async function captureSlidePngs(workDir: string, deckId: string, slideCount: number): Promise<Buffer[]> {
  const { server, port } = await startDistServer(workDir, deckId);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: SLIDE_W, height: SLIDE_H },
      deviceScaleFactor: 1,
    });
    const pngs: Buffer[] = [];
    for (let i = 1; i <= slideCount; i++) {
      const url = `http://127.0.0.1:${port}/p/${deckId}/${i}?embedded`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForSelector("#slide-container", { timeout: 30_000 });
      const loading = page.locator(".slidev-slide-loading");
      if ((await loading.count()) > 0) {
        await loading.first().waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
      }
      await new Promise((r) => setTimeout(r, 400));
      const buf = await page.locator("#slide-container").screenshot({ type: "png" });
      pngs.push(Buffer.from(buf));
    }
    return pngs;
  } finally {
    await browser.close().catch(() => {});
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function pngsToPdf(pngs: Buffer[]): Promise<Buffer> {
  const imgs = pngs
    .map((png) => `<img src="data:image/png;base64,${png.toString("base64")}"/>`)
    .join("\n");
  const html = `<!doctype html><html><head><style>
@page { size: ${SLIDE_W}px ${SLIDE_H}px; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
img { width: ${SLIDE_W}px; height: ${SLIDE_H}px; display: block; page-break-after: always; }
img:last-child { page-break-after: auto; }
</style></head><body>${imgs}</body></html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      width: `${SLIDE_W}px`,
      height: `${SLIDE_H}px`,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function renderDeckExport(
  workDir: string,
  format: SlidevExportFormat,
  outputPath: string,
): Promise<string> {
  if (!existsSync(join(workDir, "dist", "index.html"))) {
    throw new Error("deck dist not ready");
  }
  const deckId = basename(workDir);
  const slideCount = await countDeckSlides(workDir);
  const pngs = await captureSlidePngs(workDir, deckId, slideCount);
  if (!pngs.length) throw new Error("no slides captured");

  let title = "presentation";
  try {
    const outline = JSON.parse(await readFile(join(workDir, "outline.json"), "utf8")) as {
      title?: string;
    };
    if (outline.title) title = outline.title;
  } catch {
    /* keep default */
  }

  let notes: string[] | undefined;
  if (format === "pptx") {
    try {
      const { SPEECH_JSON, notesTextForSlide, parseSpeechJson } = await import("./speech.js");
      const raw = await readFile(join(workDir, SPEECH_JSON), "utf8");
      const speech = parseSpeechJson(raw);
      const byIndex = new Map(speech.slides.map((s) => [s.index, s]));
      notes = Array.from({ length: pngs.length }, (_, i) => {
        const slide = byIndex.get(i + 1);
        return slide ? notesTextForSlide(slide) : "";
      });
      if (!notes.some((n) => n.trim())) notes = undefined;
    } catch {
      notes = undefined;
    }
  }

  const bytes = format === "pdf" ? await pngsToPdf(pngs) : pptxFromPngs(pngs, title, notes);
  await writeFile(outputPath, bytes);
  return outputPath;
}
