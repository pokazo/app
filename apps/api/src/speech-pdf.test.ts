import { describe, expect, it } from "vitest";
import { speechDownloadBasename, speechPdfHtml } from "./speech-pdf.js";

describe("speechPdfHtml", () => {
  it("html includes slide heading theses and speech", () => {
    const html = speechPdfHtml("Тема", {
      slides: [{ index: 1, heading: "Слайд заголовок", theses: "т1\nт2", speech: "Речь." }],
    });
    expect(html).toContain("Тема");
    expect(html).toContain("Слайд заголовок");
    expect(html).toContain("т1");
    expect(html).toContain("Речь.");
  });
});

describe("speechDownloadBasename", () => {
  it("download name ends with спич.pdf", () => {
    expect(speechDownloadBasename("Веб дизайн")).toMatch(/спич\.pdf$/);
  });
});
