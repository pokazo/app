import { createServer, type Server } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, extname, join, normalize } from "node:path";
import { deckAssetContentType, injectPlayerChromeHide } from "./player-chrome.js";

async function slideCount(workDir: string): Promise<number> {
  const { countDeckSlides } = await import("./deck-export-render.js");
  return countDeckSlides(workDir);
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

export type VisitDeckSlidesOpts = {
  workDir: string;
  deckId?: string;
  slideCount?: number;
  viewport?: { width: number; height: number };
  /** When true, screenshot #slide-container for each slide */
  capture?: boolean;
};

export type VisitDeckSlidesResult = {
  pngs: Buffer[];
  layoutErrors: string[];
};

/** Visit each slide; collect LayoutError pageerrors and optional PNG screenshots. */
export async function visitDeckSlides(opts: VisitDeckSlidesOpts): Promise<VisitDeckSlidesResult> {
  const workDir = opts.workDir;
  if (!existsSync(join(workDir, "dist", "index.html"))) {
    throw new Error("deck dist not ready for layout render gate");
  }
  const deckId = opts.deckId ?? basename(workDir);
  const n = opts.slideCount ?? (await slideCount(workDir));
  const { server, port } = await startDistServer(workDir, deckId);
  const { chromium } = await import("playwright-chromium");
  const browser = await chromium.launch({ headless: true });
  const layoutErrors: string[] = [];
  const pngs: Buffer[] = [];
  try {
    const page = await browser.newPage({
      viewport: opts.viewport ?? { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (err) => {
      const msg = String(err?.message || err);
      if (/LayoutError\[/.test(msg)) layoutErrors.push(msg);
    });
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (/LayoutError\[/.test(text)) layoutErrors.push(text);
    });
    for (let i = 1; i <= n; i++) {
      const url = `http://127.0.0.1:${port}/p/${deckId}/${i}?embedded`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForSelector("#slide-container", { timeout: 30_000 }).catch(() => {});
      const loading = page.locator(".slidev-slide-loading");
      if ((await loading.count()) > 0) {
        await loading.first().waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
      }
      await new Promise((r) => setTimeout(r, 400));
      if (opts.capture) {
        const buf = await page.locator("#slide-container").screenshot({ type: "png" });
        pngs.push(Buffer.from(buf));
      }
      if (layoutErrors.length) {
        break;
      }
    }
    return { pngs, layoutErrors };
  } finally {
    await browser.close().catch(() => {});
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/**
 * Opens each built slide in Chromium. Vue LayoutError throws surface as pageerror
 * (slidev build alone does not execute layout setup).
 */
export async function assertDeckLayoutsRender(
  workDir: string,
  deckId = basename(workDir),
  slideCount?: number,
): Promise<void> {
  const { layoutErrors } = await visitDeckSlides({ workDir, deckId, slideCount });
  if (layoutErrors.length) {
    throw new Error(layoutErrors.join("\n"));
  }
}
