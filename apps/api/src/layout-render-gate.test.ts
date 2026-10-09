import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LAYOUT_SHOT_ORDER,
  badMarkdownForLayout,
  happyPathLayoutsMarkdown,
  writeFixturePublicImage,
} from "./layout-fixtures.js";
import { assertDeckLayoutsRender } from "./layout-render-gate.js";
import { buildSlidev, writeSlides } from "./slidev.js";

const e2e = process.env.RUN_LAYOUT_E2E === "1";

describe("buildSlidev layout gate (pre-slidev)", () => {
  it.each(LAYOUT_SHOT_ORDER)(
    "fails fast with LayoutError[%s] before invoking slidev",
    async (layout) => {
      const dir = mkdtempSync(join(tmpdir(), `pokazo-layout-bad-${layout}-`));
      await writeSlides(dir, badMarkdownForLayout(layout), "default");
      await expect(buildSlidev(dir, `/p/x/`, 5_000)).rejects.toThrow(
        new RegExp(`LayoutError\\[${layout}\\]`),
      );
    },
  );
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
});
