import { describe, expect, it } from "vitest";
import { pptxFromPngs } from "./pptx-images.js";

/** Minimal 1×1 PNG */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("pptxFromPngs", () => {
  it("builds a zip that starts with PK and includes slide parts", () => {
    const buf = pptxFromPngs([TINY_PNG, TINY_PNG], "Demo");
    expect(buf.subarray(0, 2).toString("ascii")).toBe("PK");
    const asText = buf.toString("binary");
    expect(asText).toContain("ppt/slides/slide1.xml");
    expect(asText).toContain("ppt/media/image1.png");
    expect(asText).toContain("ppt/slides/slide2.xml");
  });

  it("includes notesSlide when notes provided", () => {
    const buf = pptxFromPngs([TINY_PNG], "Demo", ["line1\n\nfull speech"]);
    const asText = buf.toString("binary");
    expect(asText).toContain("ppt/notesSlides/notesSlide1.xml");
    expect(asText).toContain("full speech");
  });

  it("omits notes parts when notes absent", () => {
    const buf = pptxFromPngs([TINY_PNG], "Demo");
    expect(buf.toString("binary")).not.toContain("notesSlides");
  });
});
