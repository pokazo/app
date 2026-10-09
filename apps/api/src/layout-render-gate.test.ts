import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  badStatsMarkdown,
  happyPathLayoutsMarkdown,
  writeFixturePublicImage,
} from "./layout-fixtures.js";
import { assertDeckLayoutsRender } from "./layout-render-gate.js";
import { buildSlidev, writeSlides } from "./slidev.js";

const e2e = process.env.RUN_LAYOUT_E2E === "1";

describe("buildSlidev layout gate (pre-slidev)", () => {
  it("fails fast with LayoutError before invoking slidev", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-layout-bad-"));
    await writeSlides(dir, badStatsMarkdown(), "default");
    await expect(buildSlidev(dir, `/p/x/`, 5_000)).rejects.toThrow(/LayoutError\[stats\]/);
  });
});

describe.skipIf(!e2e)("assertDeckLayoutsRender (RUN_LAYOUT_E2E=1)", () => {
  it(
    "passes on happy-path custom layouts",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "pokazo-layout-ok-"));
      writeFixturePublicImage(dir);
      await writeSlides(dir, happyPathLayoutsMarkdown(), "default");
      await buildSlidev(dir, `/p/${dir.split("/").pop()}/`, 300_000);
      await expect(assertDeckLayoutsRender(dir)).resolves.toBeUndefined();
    },
    360_000,
  );

  it(
    "throws LayoutError when stats has too few items",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "pokazo-layout-bad2-"));
      // Bypass md assert by writing raw file after install — use visit on a
      // prebuilt dist only when e2e slidev works; covered by pre-slidev test above.
      await writeSlides(dir, badStatsMarkdown(), "default");
      await expect(buildSlidev(dir, `/p/${dir.split("/").pop()}/`, 300_000)).rejects.toThrow(
        /LayoutError\[stats\]/,
      );
    },
    360_000,
  );
});
