import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  FILMSTRIP_THUMB_WIDTH,
  filmstripThumbAbsV2,
  filmstripThumbPath,
  filmstripThumbPathV2,
  missingFilmstripThumbIndices,
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
  it("maps 1-based Slidev index to legacy /thumbs/N.webp", () => {
    expect(filmstripThumbPath(1)).toBe("/thumbs/1.webp");
    expect(filmstripThumbPath(3)).toBe("/thumbs/3.webp");
  });

  it("maps 1-based Slidev index to /thumbs/v2/N.webp", () => {
    expect(filmstripThumbPathV2(1)).toBe("/thumbs/v2/1.webp");
    expect(filmstripThumbPathV2(3)).toBe("/thumbs/v2/3.webp");
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

describe("missingFilmstripThumbIndices", () => {
  it("lists gaps under dist/thumbs/v2", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-thumb-gap-"));
    const dist = join(dir, "dist");
    mkdirSync(join(dist, "thumbs", "v2"), { recursive: true });
    writeFileSync(filmstripThumbAbsV2(dist, 1), Buffer.from("a"));
    writeFileSync(filmstripThumbAbsV2(dist, 2), Buffer.from("b"));
    // 3 missing, 4 missing
    expect(missingFilmstripThumbIndices(dist, 4)).toEqual([3, 4]);
    writeFileSync(filmstripThumbAbsV2(dist, 3), Buffer.from("c"));
    writeFileSync(filmstripThumbAbsV2(dist, 4), Buffer.from("d"));
    expect(missingFilmstripThumbIndices(dist, 4)).toEqual([]);
  });
});

describe.skipIf(!e2e)("filmstrip thumbs screenshot goldens (RUN_THUMB_E2E=1)", () => {
  it(
    "builds photo+text slides, small WebPs under thumbs/v2, and image goldens",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "pokazo-filmstrip-thumb-"));
      const deckId = dir.split("/").pop()!;
      await writePhotoCover(dir);
      await writeSlides(dir, PHOTO_SLIDES, "default");
      await buildSlidev(dir, `/p/${deckId}/`, 300_000);

      // Legacy v1 file must survive a v2 render.
      const legacyDir = join(dir, "dist", "thumbs");
      mkdirSync(legacyDir, { recursive: true });
      const legacyBytes = Buffer.from("legacy-v1-keep");
      writeFileSync(join(legacyDir, "1.webp"), legacyBytes);

      const result = await renderDeckFilmstripThumbs({ workDir: dir, deckId, slideCount: 2 });
      expect(result.written).toBe(2);
      expect(result.slides.length).toBe(2);
      expect(result.paths).toEqual(["/thumbs/v2/1.webp", "/thumbs/v2/2.webp"]);

      const s1 = result.slides[0]!;
      const s2 = result.slides[1]!;
      expect(s1.path).toBe("/thumbs/v2/1.webp");
      expect(s2.path).toBe("/thumbs/v2/2.webp");
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

      // Before shots exist: blank frames (no heading text).
      const placeholderHtml = filmstripPageHtml([
        filmstripCellHtml({
          index: 1,
          src: "",
          heading: "Neon cities",
          mode: "empty",
        }),
        filmstripCellHtml({
          index: 2,
          src: "",
          heading: "Checklist",
          mode: "empty",
        }),
      ]);
      expect(placeholderHtml).not.toContain("Neon");
      expect(placeholderHtml).not.toContain("Checklist");
      const placeholderStrip = await screenshotHtml({
        html: placeholderHtml,
        viewport: { width: 240, height: 320 },
      });
      await assertPngGolden(placeholderStrip, "filmstrip-blank", { update });

      // On-disk v2 files match returned buffers.
      expect(readFileSync(join(dir, "dist", "thumbs", "v2", "1.webp"))).toEqual(s1.webp);
      expect(readFileSync(join(dir, "dist", "thumbs", "v2", "2.webp"))).toEqual(s2.webp);
      // Legacy v1 untouched.
      expect(readFileSync(join(dir, "dist", "thumbs", "1.webp"))).toEqual(legacyBytes);
      expect(existsSync(join(dir, "dist", "thumbs", "2.webp"))).toBe(false);
    },
    360_000,
  );
});
