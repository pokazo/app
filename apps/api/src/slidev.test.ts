import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSlidevDist,
  ensureDeckNodeModules,
  installDeckLayouts,
  scaffoldMarkdown,
  slidevMcpSpawnSpec,
  slidevSpawnSpec,
} from "./slidev.js";

describe("slidevSpawnSpec", () => {
  it("builds inside the deck directory", () => {
    const spec = slidevSpawnSpec("/tmp/deck-id", "/p/deck-id/");
    expect(spec.cwd).toBe("/tmp/deck-id");
    expect(spec.args).toEqual(["build", "slides.md", "--out", "dist", "--base", "/p/deck-id/"]);
  });
});

describe("slidevMcpSpawnSpec", () => {
  it("starts stdio MCP on slides.md in the deck directory", () => {
    const spec = slidevMcpSpawnSpec("/tmp/deck-id");
    expect(spec.cwd).toBe("/tmp/deck-id");
    expect(spec.args).toEqual(["mcp", "slides.md"]);
    expect(spec.bin).toMatch(/slidev$/);
  });
});

describe("scaffoldMarkdown", () => {
  it("writes headmatter and a single placeholder slide", () => {
    const md = scaffoldMarkdown("Demo Deck", "seriph");
    expect(md).toContain("theme: seriph");
    expect(md).toContain('title: "Demo Deck"');
    expect(md).toContain("# Demo Deck");
    expect(md.split(/^---$/m).length).toBeGreaterThanOrEqual(2);
  });
});

describe("installDeckLayouts", () => {
  it("copies timeline and stats vue layouts into the deck", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-layouts-"));
    installDeckLayouts(dir);
    expect(existsSync(join(dir, "layouts", "layout-assert.js"))).toBe(true);
    expect(existsSync(join(dir, "layouts", "palette-class.js"))).toBe(true);
    expect(existsSync(join(dir, "layouts", "timeline.vue"))).toBe(true);
    expect(existsSync(join(dir, "layouts", "stats.vue"))).toBe(true);
    expect(existsSync(join(dir, "layouts", "skills.vue"))).toBe(true);
    expect(existsSync(join(dir, "layouts", "hero.vue"))).toBe(true);
    for (const name of ["two-cols.vue", "quote.vue", "fact.vue", "icon.vue", "cards.vue"]) {
      expect(existsSync(join(dir, "layouts", name))).toBe(true);
    }
  });

  it("copies photo splits that pin cream pane and dark ink", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-layouts-"));
    installDeckLayouts(dir);
    for (const name of ["image-right.vue", "image-left.vue", "hero.vue"]) {
      const file = join(dir, "layouts", name);
      expect(existsSync(file)).toBe(true);
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/#f7f3ec/);
      expect(src).toMatch(/#161616/);
      expect(src).toMatch(/pk-palette-ink/);
      expect(src).toMatch(/opacity:\s*1/);
      expect(src).toMatch(/object-fit:\s*cover/);
    }
  });

  it("ships hero variants without split layout", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-layouts-"));
    installDeckLayouts(dir);
    const src = readFileSync(join(dir, "layouts", "hero.vue"), "utf8");
    expect(src).toMatch(/ribbon/);
    expect(src).toMatch(/corner/);
    expect(src).toMatch(/inset/);
    expect(src).toMatch(/fullbleed/);
    expect(src).toMatch(/product/);
    expect(src).not.toMatch(/pk-hero--editorial/);
    expect(src).not.toMatch(/pk-hero--centered/);
    expect(src).toMatch(/never split/i);
    expect(src).not.toMatch(/grid-template-columns:\s*1\.05fr\s+0\.95fr/);
  });
});

describe("ensureDeckNodeModules", () => {
  it("symlinks the api node_modules so the default theme resolves", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-deck-"));
    ensureDeckNodeModules(dir);
    const linked = join(dir, "node_modules");
    expect(lstatSync(linked).isSymbolicLink()).toBe(true);
    expect(realpathSync(linked).replace(/\\/g, "/")).toMatch(/apps\/api\/node_modules$/);
  });
});

describe("assertSlidevDist", () => {
  it("rejects a successful-looking build that wrote no index.html", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-deck-"));
    expect(() => assertSlidevDist(dir)).toThrow(/no dist/i);
  });

  it("accepts dist/index.html", () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-deck-"));
    mkdirSync(join(dir, "dist"));
    writeFileSync(join(dir, "dist", "index.html"), "<html></html>");
    expect(() => assertSlidevDist(dir)).not.toThrow();
  });
});
