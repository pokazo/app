import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  FILMSTRIP_THUMB_WIDTH,
  filmstripThumbPath,
  renderDeckFilmstripThumbs,
} from "./deck-thumbs.js";
import { buildSlidev, writeSlides } from "./slidev.js";
import {
  assertPngGolden,
  filmstripCellHtml,
  filmstripPageHtml,
  screenshotHtml,
  sizeCompareSheet,
  vividPhotoPng,
  webpToPng,
} from "./thumb-shot-helpers.js";

const update = process.env.UPDATE_THUMB_SHOTS === "1";
const e2e = process.env.RUN_THUMB_E2E === "1";

/** Layouts that actually show the photo (default `cover` often hides it). */
const PHOTO_SLIDES = `---
layout: image-right
image: /photo-cover.png
---

# Neon cities

Design after dark

---
layout: image-left
image: /photo-cover.png
---

# Checklist

- Smaller files
- Full slide in thumb
- No iframe in filmstrip
`;

async function writePhotoCover(workDir: string): Promise<void> {
  const pub = join(workDir, "public");
  mkdirSync(pub, { recursive: true });
  writeFileSync(join(pub, "photo-cover.png"), await vividPhotoPng());
}

describe("filmstripThumbPath", () => {
  it("maps 1-based Slidev index to /thumbs/N.webp", () => {
    expect(filmstripThumbPath(1)).toBe("/thumbs/1.webp");
    expect(filmstripThumbPath(3)).toBe("/thumbs/3.webp");
  });
});

describe("renderDeckFilmstripThumbs requires dist", () => {
  it("throws when dist missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-no-dist-"));
    await writeFile(join(dir, "slides.md"), "# x\n", "utf8");
    await expect(
      renderDeckFilmstripThumbs({ workDir: dir, deckId: "x", slideCount: 1 }),
    ).rejects.toThrow(/dist not ready/);
  });
});

describe.skipIf(!e2e)("filmstrip thumbs screenshot goldens (RUN_THUMB_E2E=1)", () => {
  it(
    "builds photo+text slides, small WebPs, and image goldens",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "pokazo-filmstrip-thumb-"));
      const deckId = dir.split("/").pop()!;
      await writePhotoCover(dir);
      await writeSlides(dir, PHOTO_SLIDES, "default");
      await buildSlidev(dir, `/p/${deckId}/`, 300_000);

      const result = await renderDeckFilmstripThumbs({ workDir: dir, deckId, slideCount: 2 });
      expect(result.written).toBe(2);
      expect(result.slides.length).toBe(2);

      const s1 = result.slides[0]!;
      const s2 = result.slides[1]!;
      const meta1 = await sharp(s1.webp).metadata();
      expect(meta1.format).toBe("webp");
      expect(meta1.width).toBeLessThanOrEqual(FILMSTRIP_THUMB_WIDTH);
      expect(s1.webpBytes).toBeLessThan(s1.pngBytes);
      expect(s1.webpBytes).toBeLessThan(80_000);
      expect(s2.webpBytes).toBeLessThan(80_000);
      // Photo layouts must carry color (not a blank white slide).
      const stats = await sharp(s1.webp).stats();
      const channels = stats.channels.map((c) => c.mean);
      expect(Math.max(...channels) - Math.min(...channels)).toBeGreaterThan(15);

      await assertPngGolden(await webpToPng(s1.webp), "thumb-page-1", { update });
      await assertPngGolden(await webpToPng(s2.webp), "thumb-page-2", { update });

      const filmHtml = filmstripPageHtml([
        filmstripCellHtml({
          index: 1,
          src: `data:image/webp;base64,${s1.webp.toString("base64")}`,
          mode: "slide-shot",
          current: true,
        }),
        filmstripCellHtml({
          index: 2,
          src: `data:image/webp;base64,${s2.webp.toString("base64")}`,
          mode: "slide-shot",
        }),
      ]);
      const filmStrip = await screenshotHtml({
        html: filmHtml,
        viewport: { width: 240, height: 320 },
      });
      await assertPngGolden(filmStrip, "filmstrip-slide-shots", { update });

      // Same slide: 1280 capture vs 400 WebP — visual + byte proof.
      expect(s1.webpBytes).toBeLessThan(s1.pngBytes / 2);
      const compare = await sizeCompareSheet({
        largePng: s1.capturePng,
        smallWebp: s1.webp,
        labelLarge: `capture ${s1.pngBytes}b`,
        labelSmall: `thumb ${s1.webpBytes}b`,
      });
      await assertPngGolden(compare, "thumb-size-compare", { update });

      const coverUri = `data:image/png;base64,${(await vividPhotoPng(400, 225)).toString("base64")}`;
      const fallbackHtml = filmstripPageHtml([
        filmstripCellHtml({
          index: 1,
          src: coverUri,
          heading: "Neon cities",
          mode: "cover-fallback",
        }),
        filmstripCellHtml({
          index: 2,
          src: "",
          heading: "Checklist",
          mode: "heading-only",
        }),
      ]);
      const fallbackStrip = await screenshotHtml({
        html: fallbackHtml,
        viewport: { width: 240, height: 320 },
      });
      await assertPngGolden(fallbackStrip, "filmstrip-cover-fallback", { update });

      // On-disk files match returned buffers.
      expect(readFileSync(join(dir, "dist", "thumbs", "1.webp"))).toEqual(s1.webp);
    },
    360_000,
  );
});
