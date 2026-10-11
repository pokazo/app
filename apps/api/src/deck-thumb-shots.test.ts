import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-chromium";
import { describe, expect, it } from "vitest";
import { comparePngBuffers } from "./layout-png-compare.js";

const shotsDir = join(dirname(fileURLToPath(import.meta.url)), "__screenshots__", "thumbs");
const update = process.env.UPDATE_THUMB_SHOTS === "1";
const e2e = process.env.RUN_THUMB_E2E === "1";

/** Minimal filmstrip CSS mirroring apps/web thumb placeholders. */
const THUMB_CSS = `
  body { margin: 0; font-family: system-ui, sans-serif; background: #f4f4f2; }
  .row { display: flex; gap: 12px; padding: 16px; }
  .deck-thumb-frame {
    position: relative; width: 220px; aspect-ratio: 16/9; border-radius: 10px;
    overflow: hidden; background: #fff; box-shadow: inset 0 0 0 1px #ddd;
  }
  .deck-thumb-ph-wrap { position: absolute; inset: 0; }
  .deck-thumb-ph { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .deck-thumb-ph-label {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 1;
    padding: 18px 8px 6px; font-size: 11px; font-weight: 600; line-height: 1.25; color: #fff;
    background: linear-gradient(transparent, rgba(18,18,18,.78));
  }
  .deck-thumb-fallback {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    padding: 8px; text-align: center; font-size: 12px; font-weight: 600; color: #666; background: #eee;
  }
  .deck-thumb-n {
    position: absolute; top: 6px; left: 6px; z-index: 2; min-width: 20px; height: 20px;
    padding: 0 6px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600; color: #fff; background: rgba(22,22,22,.55);
  }
`;

function coverDataUri(hue: number): string {
  // Tiny solid JPEG via SVG → avoids network; reads as a photo placeholder.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">
    <rect width="100%" height="100%" fill="hsl(${hue} 45% 42%)"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Bug: cover image only. Fix: cover + heading label. */
function thumbHtml(opts: {
  index: number;
  heading: string;
  image?: boolean;
  hue?: number;
  mode: "bug-image-only" | "fix-image-label" | "heading-only";
}): string {
  const n = `<span class="deck-thumb-n">${opts.index}</span>`;
  if (opts.mode === "heading-only") {
    return `<span class="deck-thumb-frame"><span class="deck-thumb-fallback">${opts.heading}</span>${n}</span>`;
  }
  if (opts.mode === "bug-image-only") {
    return `<span class="deck-thumb-frame"><img class="deck-thumb-ph" src="${coverDataUri(opts.hue ?? 120)}" alt="">${n}</span>`;
  }
  return `<span class="deck-thumb-frame"><span class="deck-thumb-ph-wrap">
    <img class="deck-thumb-ph" src="${coverDataUri(opts.hue ?? 120)}" alt="">
    <span class="deck-thumb-ph-label">${opts.heading}</span>
  </span>${n}</span>`;
}

function progressivePage(step: 1 | 2 | 3, mode: "bug-image-only" | "fix-image-label"): string {
  const slides = [
    { index: 1, heading: "Что такое фотосинтез", hue: 110 },
    { index: 2, heading: "Где происходит фотосинтез", hue: 140 },
    { index: 3, heading: "Этапы фотосинтеза", hue: 40 },
  ].slice(0, step);
  const thumbs = slides
    .map((s) =>
      thumbHtml({
        index: s.index,
        heading: s.heading,
        hue: s.hue,
        mode: s.index === 3 && mode === "fix-image-label" ? "heading-only" : mode,
      }),
    )
    .join("\n");
  return `<!doctype html><html><head><style>${THUMB_CSS}</style></head>
<body><div class="row" id="film">${thumbs}</div></body></html>`;
}

async function shotHtml(html: string, name: string): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 280 } });
    await page.setContent(html, { waitUntil: "load" });
    const buf = await page.locator("#film").screenshot({ type: "png" });
    if (update) {
      mkdirSync(shotsDir, { recursive: true });
      writeFileSync(join(shotsDir, `${name}.png`), buf);
    }
    return buf;
  } finally {
    await browser.close();
  }
}

describe("deck thumb placeholder contract (unit)", () => {
  it("fixed markup includes heading text for image placeholders", () => {
    const html = progressivePage(2, "fix-image-label");
    expect(html).toContain('class="deck-thumb-ph-label"');
    expect(html).toContain("Что такое фотосинтез");
    expect(html).toContain("Где происходит фотосинтез");
  });

  it("bug markup has cover image but no heading label element", () => {
    const html = progressivePage(2, "bug-image-only");
    expect(html).toContain('class="deck-thumb-ph"');
    expect(html).not.toContain('class="deck-thumb-ph-label"');
  });
});

describe.skipIf(!e2e)("deck thumb progressive screenshots (RUN_THUMB_E2E=1)", () => {
  it(
    "fixed progressive steps keep headings visible on covers",
    async () => {
      mkdirSync(shotsDir, { recursive: true });
      for (const step of [1, 2, 3] as const) {
        const name = `progressive-${step}-fix`;
        const actual = await shotHtml(progressivePage(step, "fix-image-label"), name);
        const goldenPath = join(shotsDir, `${name}.png`);
        if (update || !existsSync(goldenPath)) {
          writeFileSync(goldenPath, actual);
          continue;
        }
        const expected = readFileSync(goldenPath);
        const { ok, diffRatio } = comparePngBuffers(actual, expected);
        if (!ok) writeFileSync(join(shotsDir, `${name}.actual.png`), actual);
        expect(ok, `${name} diffRatio=${diffRatio.toFixed(4)}`).toBe(true);
      }
    },
    120_000,
  );

  it(
    "bug image-only strip differs from fixed labeled strip",
    async () => {
      const bug = await shotHtml(progressivePage(2, "bug-image-only"), "progressive-2-bug");
      const fix = await shotHtml(progressivePage(2, "fix-image-label"), "progressive-2-fix");
      const { ok } = comparePngBuffers(bug, fix);
      // Must look different — label band is the regression signal.
      expect(ok).toBe(false);
      writeFileSync(join(shotsDir, "progressive-2-bug.png"), bug);
      writeFileSync(join(shotsDir, "progressive-2-fix.png"), fix);
    },
    120_000,
  );
});
