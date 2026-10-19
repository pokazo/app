import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertPngGolden,
  filmstripCellHtml,
  filmstripPageHtml,
  screenshotHtml,
  vividPhotoPng,
} from "./thumb-shot-helpers.js";

const webCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../web/src/styles/global.css"),
  "utf8",
);

const update = process.env.UPDATE_THUMB_SHOTS === "1";
const e2e = process.env.RUN_THUMB_E2E === "1";

function coverDataUri(hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">
    <rect width="100%" height="100%" fill="hsl(${hue} 55% 42%)"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

describe("filmstrip markup contract (unit)", () => {
  it("slide-shot has image and never embeds heading text", () => {
    const html = filmstripCellHtml({
      index: 1,
      src: "/thumbs/v2/1.webp",
      heading: "Инженерная IT-школа",
      mode: "slide-shot",
    });
    expect(html).toContain('class="deck-thumb-img"');
    expect(html).toContain("/thumbs/v2/1.webp");
    expect(html).not.toContain("Инженерная IT-школа");
    expect(html).not.toContain("deck-thumb-fallback");
  });

  it("empty placeholder has no heading text and no img", () => {
    const html = filmstripCellHtml({
      index: 3,
      src: "",
      heading: "Практика в реальном окружении",
      mode: "empty",
    });
    expect(html).toContain("deck-thumb-blank");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("Практика");
    expect(html).not.toContain("deck-thumb-fallback");
  });

  it("web filmstrip CSS has image/blank cells and no heading fallback", () => {
    expect(webCss).toContain(".deck-thumb-img");
    expect(webCss).toContain(".deck-thumb-blank");
    expect(webCss).not.toContain("deck-thumb-fallback");
    expect(webCss).not.toContain("deck-thumb-ph-wrap");
  });
});

describe.skipIf(!e2e)("filmstrip UI screenshot goldens (RUN_THUMB_E2E=1)", () => {
  it(
    "slide-shot strip uses photo rasters without text overlay",
    async () => {
      const photo = await vividPhotoPng(400, 225);
      const uri = `data:image/png;base64,${photo.toString("base64")}`;
      const html = filmstripPageHtml([
        filmstripCellHtml({ index: 1, src: uri, mode: "slide-shot", current: true }),
        filmstripCellHtml({
          index: 2,
          src: coverDataUri(200),
          mode: "slide-shot",
        }),
      ]);
      const buf = await screenshotHtml({ html, viewport: { width: 240, height: 320 } });
      await assertPngGolden(buf, "ui-slide-shot-strip", { update });
    },
    60_000,
  );

  it(
    "empty strip before backend shots exist — no heading text",
    async () => {
      const html = filmstripPageHtml([
        filmstripCellHtml({
          index: 1,
          src: "",
          heading: "Что такое фотосинтез",
          mode: "empty",
          current: true,
        }),
        filmstripCellHtml({
          index: 2,
          src: "",
          heading: "Где происходит фотосинтез",
          mode: "empty",
        }),
        filmstripCellHtml({
          index: 3,
          src: "",
          heading: "Этапы фотосинтеза",
          mode: "empty",
        }),
      ]);
      expect(html).not.toContain("фотосинтез");
      const buf = await screenshotHtml({ html, viewport: { width: 240, height: 420 } });
      await assertPngGolden(buf, "ui-blank-strip", { update });
    },
    60_000,
  );
});
