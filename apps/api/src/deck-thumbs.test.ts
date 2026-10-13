import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-chromium";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  FILMSTRIP_THUMB_WIDTH,
  filmstripThumbPath,
  renderDeckFilmstripThumbs,
} from "./deck-thumbs.js";
import { writeFixturePublicImage } from "./layout-fixtures.js";
import { comparePngBuffers } from "./layout-png-compare.js";
import { buildSlidev, writeSlides } from "./slidev.js";

const shotsDir = join(dirname(fileURLToPath(import.meta.url)), "__screenshots__", "thumbs");
const update = process.env.UPDATE_THUMB_SHOTS === "1";
const e2e = process.env.RUN_THUMB_E2E === "1";

const TWO_SLIDES = `---
layout: cover
image: /slide-1.png
---

# Thumb shot one

Short subtitle for filmstrip.

---
layout: default
---

# Thumb shot two

- Point A
- Point B
`;

describe("filmstripThumbPath", () => {
  it("maps 1-based Slidev index to /thumbs/N.webp", () => {
    expect(filmstripThumbPath(1)).toBe("/thumbs/1.webp");
    expect(filmstripThumbPath(3)).toBe("/thumbs/3.webp");
  });
});

describe.skipIf(!e2e)("filmstrip thumbs from slide screenshots (RUN_THUMB_E2E=1)", () => {
  it(
    "writes WebP thumbs much smaller than capture PNGs and matches filmstrip golden",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "pokazo-filmstrip-thumb-"));
      const deckId = dir.split("/").pop()!;
      writeFixturePublicImage(dir, "slide-1.png");
      await writeSlides(dir, TWO_SLIDES, "default");
      await buildSlidev(dir, `/p/${deckId}/`, 300_000);

      const result = await renderDeckFilmstripThumbs({ workDir: dir, deckId, slideCount: 2 });
      expect(result.written).toBe(2);
      expect(result.paths).toEqual(["/thumbs/1.webp", "/thumbs/2.webp"]);

      const w1 = readFileSync(join(dir, "dist", "thumbs", "1.webp"));
      const w2 = readFileSync(join(dir, "dist", "thumbs", "2.webp"));
      const meta1 = await sharp(w1).metadata();
      expect(meta1.format).toBe("webp");
      expect(meta1.width).toBeLessThanOrEqual(FILMSTRIP_THUMB_WIDTH);
      expect(w1.byteLength).toBeLessThan(80_000);
      expect(w2.byteLength).toBeLessThan(80_000);
      // Two thumbs together should stay far below one full-res slide PNG (~100KB–1MB+).
      expect(w1.byteLength + w2.byteLength).toBeLessThan(160_000);

      const filmHtml = `<!doctype html><html><head><style>
        body{margin:0;background:#f4f4f2;font-family:system-ui,sans-serif}
        #film{display:flex;flex-direction:column;gap:10px;padding:12px;width:200px}
        .deck-thumb-frame{position:relative;width:176px;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#fff;box-shadow:inset 0 0 0 1px #ddd}
        .deck-thumb-ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .deck-thumb-n{position:absolute;top:6px;left:6px;z-index:2;min-width:20px;height:20px;padding:0 6px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;background:rgba(22,22,22,.55)}
      </style></head><body><div id="film">
        <span class="deck-thumb-frame"><img class="deck-thumb-ph" src="data:image/webp;base64,${w1.toString("base64")}" alt=""><span class="deck-thumb-n">1</span></span>
        <span class="deck-thumb-frame"><img class="deck-thumb-ph" src="data:image/webp;base64,${w2.toString("base64")}" alt=""><span class="deck-thumb-n">2</span></span>
      </div></body></html>`;

      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage({ viewport: { width: 240, height: 320 } });
        await page.setContent(filmHtml, { waitUntil: "load" });
        await page.waitForTimeout(200);
        const buf = Buffer.from(await page.locator("#film").screenshot({ type: "png" }));
        mkdirSync(shotsDir, { recursive: true });
        const goldenPath = join(shotsDir, "filmstrip-slide-shots.png");
        if (update || !existsSync(goldenPath)) {
          writeFileSync(goldenPath, buf);
        } else {
          const expected = readFileSync(goldenPath);
          const { ok, diffRatio } = comparePngBuffers(buf, expected);
          if (!ok) writeFileSync(join(shotsDir, "filmstrip-slide-shots.actual.png"), buf);
          expect(ok, `filmstrip-slide-shots diffRatio=${diffRatio.toFixed(4)}`).toBe(true);
        }
      } finally {
        await browser.close();
      }
    },
    360_000,
  );
});

describe("renderDeckFilmstripThumbs requires dist", () => {
  it("throws when dist missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-no-dist-"));
    await writeFile(join(dir, "slides.md"), "# x\n", "utf8");
    await expect(renderDeckFilmstripThumbs({ workDir: dir, deckId: "x", slideCount: 1 })).rejects.toThrow(
      /dist not ready/,
    );
  });
});
