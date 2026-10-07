import { mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  contentDisposition,
  downloadBasename,
  exportArtifactPath,
  isExportFormat,
  isExportFresh,
} from "./deck-export.js";

describe("isExportFormat", () => {
  it("accepts pdf and pptx", () => {
    expect(isExportFormat("pdf")).toBe(true);
    expect(isExportFormat("pptx")).toBe(true);
    expect(isExportFormat("png")).toBe(false);
  });
});

describe("downloadBasename", () => {
  it("keeps cyrillic topic and adds extension", () => {
    expect(downloadBasename("Веб дизайн: Введение!", "pdf")).toBe("Веб дизайн Введение.pdf");
  });

  it("falls back when topic is empty after sanitize", () => {
    expect(downloadBasename("!!!", "pptx")).toBe("presentation.pptx");
  });
});

describe("contentDisposition", () => {
  it("emits ascii filename and utf-8 star param", () => {
    const h = contentDisposition("Веб.pdf");
    expect(h).toMatch(/filename=".*\.pdf"/);
    expect(h).toMatch(/filename\*=UTF-8''/);
    expect(h).toContain(encodeURIComponent("Веб.pdf"));
  });
});

describe("isExportFresh", () => {
  it("is false when artifact missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-export-"));
    writeFileSync(join(dir, "slides.md"), "# hi");
    expect(isExportFresh(dir, "pdf")).toBe(false);
  });

  it("is true when export is newer than slides", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-export-"));
    const slides = join(dir, "slides.md");
    writeFileSync(slides, "# hi");
    const older = Date.now() / 1000 - 20;
    utimesSync(slides, older, older);
    writeFileSync(exportArtifactPath(dir, "pdf"), "%PDF");
    expect(isExportFresh(dir, "pdf")).toBe(true);
  });

  it("is false when slides are newer than export", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-export-"));
    const artifact = exportArtifactPath(dir, "pptx");
    writeFileSync(artifact, "PK");
    const older = Date.now() / 1000 - 20;
    utimesSync(artifact, older, older);
    writeFileSync(join(dir, "slides.md"), "# newer");
    expect(isExportFresh(dir, "pptx")).toBe(false);
  });
});
