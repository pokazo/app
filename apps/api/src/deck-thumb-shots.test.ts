import { describe, expect, it } from "vitest";
import {
  assertPngGolden,
  filmstripCellHtml,
  filmstripPageHtml,
  screenshotHtml,
  vividPhotoPng,
} from "./thumb-shot-helpers.js";

const update = process.env.UPDATE_THUMB_SHOTS === "1";
const e2e = process.env.RUN_THUMB_E2E === "1";

function coverDataUri(hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">
    <rect width="100%" height="100%" fill="hsl(${hue} 55% 42%)"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

describe("filmstrip markup contract (unit)", () => {
  it("slide-shot has image and no heading label (v2 path)", () => {
    const html = filmstripCellHtml({
      index: 1,
      src: "/thumbs/v2/1.webp",
      mode: "slide-shot",
    });
    expect(html).toContain('class="deck-thumb-ph"');
    expect(html).toContain("/thumbs/v2/1.webp");
    expect(html).not.toContain("deck-thumb-ph-label");
  });

  it("heading-only has fallback text, no img", () => {
    const html = filmstripCellHtml({
      index: 3,
      src: "",
      heading: "Этапы",
      mode: "heading-only",
    });
    expect(html).toContain("deck-thumb-fallback");
    expect(html).not.toContain("<img");
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
    "heading-only strip before backend shots exist",
    async () => {
      const html = filmstripPageHtml([
        filmstripCellHtml({
          index: 1,
          src: "",
          heading: "Что такое фотосинтез",
          mode: "heading-only",
          current: true,
        }),
        filmstripCellHtml({
          index: 2,
          src: "",
          heading: "Где происходит фотосинтез",
          mode: "heading-only",
        }),
        filmstripCellHtml({
          index: 3,
          src: "",
          heading: "Этапы фотосинтеза",
          mode: "heading-only",
        }),
      ]);
      const buf = await screenshotHtml({ html, viewport: { width: 240, height: 420 } });
      await assertPngGolden(buf, "ui-heading-only-strip", { update });
    },
    60_000,
  );
});
