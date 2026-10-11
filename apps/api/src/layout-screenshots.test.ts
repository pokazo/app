import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  HERO_VARIANT_SHOT_ORDER,
  LAYOUT_SHOT_ORDER,
  happyPathLayoutsMarkdown,
  heroVariantsMarkdown,
  writeFixturePublicImage,
  writeHeroFixturePublicImage,
} from "./layout-fixtures.js";
import { comparePngBuffers } from "./layout-png-compare.js";
import { visitDeckSlides } from "./layout-render-gate.js";
import { buildSlidev, writeSlides } from "./slidev.js";

const shotsDir = join(dirname(fileURLToPath(import.meta.url)), "__screenshots__", "layouts");
const update = process.env.UPDATE_LAYOUT_SHOTS === "1";
const e2e = process.env.RUN_LAYOUT_E2E === "1";

function assertGoldens(pngs: Buffer[], names: readonly string[]) {
  expect(pngs.length).toBe(names.length);
  if (update) mkdirSync(shotsDir, { recursive: true });
  for (let i = 0; i < names.length; i++) {
    const name = names[i]!;
    const goldenPath = join(shotsDir, `${name}.png`);
    const actual = pngs[i]!;
    if (update || !existsSync(goldenPath)) {
      writeFileSync(goldenPath, actual);
      continue;
    }
    const expected = readFileSync(goldenPath);
    const { ok, diffRatio } = comparePngBuffers(actual, expected);
    if (!ok) {
      writeFileSync(join(shotsDir, `${name}.actual.png`), actual);
    }
    expect(ok, `${name} diffRatio=${diffRatio.toFixed(4)}`).toBe(true);
  }
}

describe.skipIf(!e2e)("layout golden screenshots (RUN_LAYOUT_E2E=1)", () => {
  it(
    "matches golden PNG for each custom layout",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "pokazo-layout-shot-"));
      const deckId = dir.split("/").pop()!;
      writeFixturePublicImage(dir);
      await writeSlides(dir, happyPathLayoutsMarkdown(), "default");
      await buildSlidev(dir, `/p/${deckId}/`, 300_000);

      const { pngs, layoutErrors } = await visitDeckSlides({
        workDir: dir,
        deckId,
        slideCount: LAYOUT_SHOT_ORDER.length,
        viewport: { width: 1920, height: 1080 },
        capture: true,
      });
      expect(layoutErrors).toEqual([]);
      assertGoldens(pngs, LAYOUT_SHOT_ORDER);
    },
    360_000,
  );

  it(
    "matches golden PNG for each hero variant",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "pokazo-hero-shot-"));
      const deckId = dir.split("/").pop()!;
      writeHeroFixturePublicImage(dir);
      await writeSlides(dir, heroVariantsMarkdown(), "default");
      await buildSlidev(dir, `/p/${deckId}/`, 300_000);

      const { pngs, layoutErrors } = await visitDeckSlides({
        workDir: dir,
        deckId,
        slideCount: HERO_VARIANT_SHOT_ORDER.length,
        viewport: { width: 1920, height: 1080 },
        capture: true,
      });
      expect(layoutErrors).toEqual([]);
      assertGoldens(pngs, HERO_VARIANT_SHOT_ORDER);
    },
    360_000,
  );
});
