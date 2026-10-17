import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-chromium";
import sharp from "sharp";
import { comparePngBuffers } from "./layout-png-compare.js";

export const THUMB_SHOTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "__screenshots__",
  "thumbs",
);

/** CSS aligned with apps/web filmstrip (176px column cell). */
export const FILMSTRIP_THUMB_CSS = `
  body { margin: 0; font-family: system-ui, sans-serif; background: #f4f4f2; }
  #film {
    display: flex; flex-direction: column; gap: 10px;
    padding: 12px; width: 200px; box-sizing: border-box;
  }
  .deck-thumb-frame {
    position: relative; width: 176px; aspect-ratio: 16 / 9;
    border-radius: 10px; overflow: hidden; background: #fff;
    box-shadow: inset 0 0 0 1px #ddd;
  }
  .deck-thumb-frame.is-current { box-shadow: inset 0 0 0 2px #6c5ce7; }
  .deck-thumb-ph-wrap { position: absolute; inset: 0; }
  .deck-thumb-ph {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: contain; display: block; background: #fff;
  }
  .deck-thumb-fallback {
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; padding: 8px; text-align: center;
    font-size: 12px; font-weight: 600; color: #666; background: #eee;
  }
  .deck-thumb-n {
    position: absolute; top: 6px; left: 6px; z-index: 2; min-width: 20px;
    height: 20px; padding: 0 6px; border-radius: 6px; display: inline-flex;
    align-items: center; justify-content: center; font-size: 11px;
    font-weight: 600; color: #fff; background: rgba(22, 22, 22, 0.55);
  }
`;

/** Vivid “photo” so goldens show image content, not a near-white fixture. */
export async function vividPhotoPng(width = 1200, height = 800): Promise<Buffer> {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1a0a3e"/>
        <stop offset="45%" stop-color="#0e4d6e"/>
        <stop offset="100%" stop-color="#ff2d6a"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="78%" cy="32%" r="120" fill="#ffe66d" opacity="0.85"/>
    <rect x="8%" y="55%" width="55%" height="28%" rx="18" fill="#00f5d4" opacity="0.55"/>
    <text x="10%" y="28%" fill="#fff" font-family="system-ui,sans-serif" font-size="72" font-weight="700">PHOTO</text>
  </svg>`);
  return sharp(svg).png().toBuffer();
}

export async function assertPngGolden(
  actual: Buffer,
  name: string,
  opts?: { update?: boolean },
): Promise<void> {
  const update = opts?.update ?? process.env.UPDATE_THUMB_SHOTS === "1";
  mkdirSync(THUMB_SHOTS_DIR, { recursive: true });
  const goldenPath = join(THUMB_SHOTS_DIR, `${name}.png`);
  if (update || !existsSync(goldenPath)) {
    writeFileSync(goldenPath, actual);
    return;
  }
  const expected = readFileSync(goldenPath);
  const { ok, diffRatio } = comparePngBuffers(actual, expected);
  if (!ok) writeFileSync(join(THUMB_SHOTS_DIR, `${name}.actual.png`), actual);
  if (!ok) {
    throw new Error(`${name} diffRatio=${diffRatio.toFixed(4)} (wrote ${name}.actual.png)`);
  }
}

export async function webpToPng(webp: Buffer): Promise<Buffer> {
  return sharp(webp).png().toBuffer();
}

export async function screenshotHtml(opts: {
  html: string;
  selector?: string;
  viewport: { width: number; height: number };
}): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: opts.viewport });
    await page.setContent(opts.html, { waitUntil: "load" });
    await page.waitForTimeout(150);
    const loc = page.locator(opts.selector ?? "#film");
    return Buffer.from(await loc.screenshot({ type: "png" }));
  } finally {
    await browser.close();
  }
}

export function filmstripCellHtml(opts: {
  index: number;
  src: string;
  heading?: string;
  /** slide shot = backend raster only; heading-only = placeholder before shot */
  mode: "slide-shot" | "heading-only";
  current?: boolean;
}): string {
  const n = `<span class="deck-thumb-n">${opts.index}</span>`;
  const frameClass = opts.current ? "deck-thumb-frame is-current" : "deck-thumb-frame";
  if (opts.mode === "heading-only") {
    return `<span class="${frameClass}"><span class="deck-thumb-fallback">${opts.heading ?? ""}</span>${n}</span>`;
  }
  return `<span class="${frameClass}"><span class="deck-thumb-ph-wrap"><img class="deck-thumb-ph" src="${opts.src}" alt=""></span>${n}</span>`;
}

export function filmstripPageHtml(cells: string[]): string {
  return `<!doctype html><html><head><style>${FILMSTRIP_THUMB_CSS}</style></head>
<body><div id="film">${cells.join("\n")}</div></body></html>`;
}

/** Side-by-side: large capture vs small thumb — proves size reduction visually. */
export async function sizeCompareSheet(opts: {
  largePng: Buffer;
  smallWebp: Buffer;
  labelLarge?: string;
  labelSmall?: string;
}): Promise<Buffer> {
  const large = await sharp(opts.largePng).resize({ width: 480 }).png().toBuffer();
  const small = await sharp(opts.smallWebp).resize({ width: 160 }).png().toBuffer();
  const largeMeta = await sharp(large).metadata();
  const smallMeta = await sharp(small).metadata();
  const gap = 24;
  const pad = 40;
  const w = (largeMeta.width ?? 480) + gap + (smallMeta.width ?? 160) + pad * 2;
  const h = Math.max(largeMeta.height ?? 270, smallMeta.height ?? 90) + pad * 2 + 36;
  const svgLabel = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="#f4f4f2"/>
    <text x="${pad}" y="28" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#333">${opts.labelLarge ?? "capture"}</text>
    <text x="${pad + (largeMeta.width ?? 480) + gap}" y="28" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#333">${opts.labelSmall ?? "thumb webp"}</text>
  </svg>`);
  return sharp(svgLabel)
    .composite([
      { input: large, top: pad + 20, left: pad },
      { input: small, top: pad + 20, left: pad + (largeMeta.width ?? 480) + gap },
    ])
    .png()
    .toBuffer();
}
