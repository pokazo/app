import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildResearchArchive,
  factsDownloadBasename,
  ResearchArchiveEmptyError,
} from "./research-export.js";

const dirs: string[] = [];

afterEach(() => {
  for (const d of dirs.splice(0)) {
    rmSync(d, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const d = mkdtempSync(join(tmpdir(), "pokazo-facts-"));
  dirs.push(d);
  return d;
}

describe("factsDownloadBasename", () => {
  it("sanitizes topic and appends факты.zip", () => {
    expect(factsDownloadBasename("Веб дизайн: Введение!")).toBe("Веб дизайн Введение факты.zip");
  });

  it("falls back when topic is empty symbols", () => {
    expect(factsDownloadBasename("!!!")).toBe("presentation факты.zip");
  });
});

describe("buildResearchArchive", () => {
  it("packs research.md, assets.json, and public images", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "research.md"), "# Research\n\n- fact\n", "utf8");
    writeFileSync(join(dir, "assets.json"), JSON.stringify({ attributions: [] }), "utf8");
    mkdirSync(join(dir, "public"));
    writeFileSync(join(dir, "public", "slide-1.jpg"), Buffer.from("fake-jpg"));

    const buf = await buildResearchArchive(dir);
    expect(buf.subarray(0, 2).toString("ascii")).toBe("PK");
    const asText = buf.toString("binary");
    expect(asText).toContain("research.md");
    expect(asText).toContain("assets.json");
    expect(asText).toContain("images/slide-1.jpg");
  });

  it("works with only research.md", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "research.md"), "brief", "utf8");
    const buf = await buildResearchArchive(dir);
    expect(buf.toString("binary")).toContain("research.md");
    expect(buf.toString("binary")).not.toContain("images/");
  });

  it("works with only public images", async () => {
    const dir = tempDir();
    mkdirSync(join(dir, "public"));
    writeFileSync(join(dir, "public", "a.png"), Buffer.from("png"));
    const buf = await buildResearchArchive(dir);
    expect(buf.toString("binary")).toContain("images/a.png");
  });

  it("throws when nothing to pack", async () => {
    const dir = tempDir();
    await expect(buildResearchArchive(dir)).rejects.toBeInstanceOf(ResearchArchiveEmptyError);
  });

  it("skips directories and dotfiles under public/", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "research.md"), "x", "utf8");
    mkdirSync(join(dir, "public", "nested"), { recursive: true });
    writeFileSync(join(dir, "public", ".DS_Store"), "meta");
    writeFileSync(join(dir, "public", "ok.webp"), Buffer.from("w"));

    const asText = (await buildResearchArchive(dir)).toString("binary");
    expect(asText).toContain("images/ok.webp");
    expect(asText).not.toContain(".DS_Store");
    expect(asText).not.toContain("nested");
  });
});
