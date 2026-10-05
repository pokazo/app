import { lstatSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertSlidevDist, ensureDeckNodeModules, slidevSpawnSpec } from "./slidev.js";

describe("slidevSpawnSpec", () => {
  it("builds inside the deck directory", () => {
    const spec = slidevSpawnSpec("/tmp/deck-id", "/p/deck-id/");
    expect(spec.cwd).toBe("/tmp/deck-id");
    expect(spec.args).toEqual(["build", "slides.md", "--out", "dist", "--base", "/p/deck-id/"]);
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
