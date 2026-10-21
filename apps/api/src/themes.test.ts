import { describe, expect, it } from "vitest";
import { guardMarkdown } from "./md-guard.js";
import {
  layoutPalette,
  sanitizePickerTheme,
  sanitizeSelectableTheme,
  SELECTABLE_THEME_IDS,
  slidevThemeId,
} from "./themes.js";

describe("picker theme", () => {
  it("accepts official ids, brand packs, palette packs, and auto", () => {
    expect(sanitizePickerTheme("seriph")).toBe("seriph");
    expect(sanitizePickerTheme("auto")).toBe("auto");
    expect(sanitizePickerTheme("ink-dark")).toBe("ink-dark");
    expect(sanitizePickerTheme("brand-auto")).toBe("brand-auto");
    expect(sanitizePickerTheme("ocean")).toBe("ocean");
    expect(sanitizePickerTheme("wine")).toBe("wine");
    expect(sanitizePickerTheme("nope")).toBe("auto");
  });

  it("selectable themes exclude auto and sanitize to default", () => {
    expect(SELECTABLE_THEME_IDS).not.toContain("auto");
    expect(sanitizeSelectableTheme("bricks")).toBe("bricks");
    expect(sanitizeSelectableTheme("auto")).toBe("default");
    expect(sanitizeSelectableTheme("nope")).toBe("default");
  });

  it("maps auto, brand packs, and palette packs to the default Slidev package", () => {
    expect(slidevThemeId("auto")).toBe("default");
    expect(slidevThemeId("bricks")).toBe("bricks");
    expect(slidevThemeId("ink-dark")).toBe("default");
    expect(slidevThemeId("brand-auto")).toBe("default");
    expect(slidevThemeId("ocean")).toBe("default");
    expect(slidevThemeId("amber")).toBe("default");
    expect(slidevThemeId("nope")).toBe("default");
  });

  it("maps picker themes to layout palettes", () => {
    expect(layoutPalette("shibainu")).toBe("cream");
    expect(layoutPalette("ink-dark")).toBe("ink");
    expect(layoutPalette("brand-auto")).toBe("auto");
    expect(layoutPalette("auto")).toBe("cream");
    expect(layoutPalette("ocean")).toBe("ocean");
    expect(layoutPalette("forest")).toBe("forest");
    expect(layoutPalette("slate")).toBe("slate");
    expect(layoutPalette("amber")).toBe("amber");
    expect(layoutPalette("wine")).toBe("wine");
    expect(layoutPalette("neon")).toBe("neon");
    expect(layoutPalette("sunset")).toBe("sunset");
    expect(layoutPalette("candy")).toBe("candy");
    expect(layoutPalette("volt")).toBe("volt");
  });
});

describe("md-guard theme", () => {
  it("pins lean Slidev tooling flags in headmatter", () => {
    const out = guardMarkdown(`---\ntheme: default\ntitle: Hi\nmonaco: true\n---\n\n# Hi`, "default");
    expect(out).toMatch(/^monaco: false$/m);
    expect(out).toMatch(/^twoslash: false$/m);
    expect(out).toMatch(/^remoteAssets: false$/m);
    expect(out).toMatch(/^record: false$/m);
    expect(out).toMatch(/^transition: slide-left$/m);
    expect(out).toMatch(/^drawings:\n {2}enabled: false$/m);
    expect(out).not.toMatch(/monaco: true/);
  });

  it("pins the chosen Slidev theme in headmatter", () => {
    const out = guardMarkdown(`---\ntheme: evil\ntitle: Hi\n---\n\n# Hi`, "seriph");
    expect(out).toMatch(/^theme: seriph$/m);
    expect(out).not.toMatch(/theme: evil/);
  });

  it("pins layout palette for brand packs", () => {
    const out = guardMarkdown(`---\ntheme: default\ntitle: Hi\n---\n\n# Hi`, "brand-auto");
    expect(out).toMatch(/^theme: default$/m);
    expect(out).toMatch(/^palette: auto$/m);
  });

  it("pins layout palette for ocean pack", () => {
    const out = guardMarkdown(`---\ntheme: default\ntitle: Hi\n---\n\n# Hi`, "ocean");
    expect(out).toMatch(/^theme: default$/m);
    expect(out).toMatch(/^palette: ocean$/m);
  });

  it("pins brand-auto palette on inserted slides that omitted palette", () => {
    const out = guardMarkdown(
      `---\ntheme: default\nlayout: hero\npalette: auto\n---\n\n# Hero\n\n---\nlayout: timeline\nkicker: ЭТАПЫ\n---\n\n# Timeline`,
      "brand-auto",
    );
    const blocks = [...out.matchAll(/^---\n([\s\S]*?)\n---/gm)].map((m) => m[1]);
    expect(blocks).toHaveLength(2);
    for (const fm of blocks) {
      expect(fm).toMatch(/^palette: auto$/m);
      expect(fm).not.toMatch(/palette: cream/);
    }
  });

  it("pins palette on every slide frontmatter (layout props are per-slide)", () => {
    const out = guardMarkdown(
      `---\ntheme: default\nlayout: hero\n---\n\n# One\n\n---\nlayout: stats\n---\n\n# Two\n\n---\nlayout: image-right\n---\n\n# Three`,
      "ink-dark",
    );
    const blocks = [...out.matchAll(/^---\n([\s\S]*?)\n---/gm)].map((m) => m[1]);
    expect(blocks).toHaveLength(3);
    for (const fm of blocks) {
      expect(fm).toMatch(/^palette: ink$/m);
    }
    expect(out).toMatch(/^theme: default$/m);
  });

  it("pins deck palette on spotlight slides (ignores model palette)", () => {
    const out = guardMarkdown(
      `---\ntheme: default\nlayout: hero\n---\n\n# One\n\n---\nlayout: spotlight\npalette: ocean\nimage: /slide-2.png\n---\n\n# Spot`,
      "ink-dark",
    );
    const blocks = [...out.matchAll(/^---\n([\s\S]*?)\n---/gm)].map((m) => m[1]!);
    expect(blocks[0]).toMatch(/^palette: ink$/m);
    expect(blocks[1]).toMatch(/^palette: ink$/m);
    expect(blocks[1]).toMatch(/^layout: spotlight$/m);
    expect(blocks[1]).not.toMatch(/^palette: ocean$/m);
  });

  it("pins deck palette on agenda slides (ignores model palette)", () => {
    const out = guardMarkdown(
      `---\ntheme: default\nlayout: hero\n---\n\n# One\n\n---\nlayout: agenda\npalette: candy\nitems:\n  - title: A\n  - title: B\n  - title: C\n---\n\n# Agenda\n\nDesc.`,
      "ink-dark",
    );
    const blocks = [...out.matchAll(/^---\n([\s\S]*?)\n---/gm)].map((m) => m[1]!);
    expect(blocks[0]).toMatch(/^palette: ink$/m);
    expect(blocks[1]).toMatch(/^palette: ink$/m);
    expect(blocks[1]).toMatch(/^layout: agenda$/m);
    expect(blocks[1]).not.toMatch(/^palette: candy$/m);
  });

  it("seriph deck keeps cream on agenda (no random slate jump)", () => {
    const out = guardMarkdown(
      `---\ntheme: seriph\nlayout: hero\npalette: cream\n---\n\n# One\n\n---\nlayout: agenda\npalette: slate\nitems:\n  - title: A\n---\n\n# TOC`,
      "seriph",
    );
    const blocks = [...out.matchAll(/^---\n([\s\S]*?)\n---/gm)].map((m) => m[1]!);
    expect(blocks[1]).toMatch(/^palette: cream$/m);
    expect(blocks[1]).not.toMatch(/^palette: slate$/m);
  });

  it("forceAllPalettes overwrites spotlight and agenda palette on retheme", () => {
    const out = guardMarkdown(
      `---\ntheme: default\nlayout: hero\npalette: ocean\n---\n\n# One\n\n---\nlayout: spotlight\npalette: candy\nimage: /slide-2.png\n---\n\n# Spot\n\n---\nlayout: agenda\npalette: neon\nitems:\n  - title: A\n---\n\n# Agenda`,
      "forest",
      { forceAllPalettes: true },
    );
    const blocks = [...out.matchAll(/^---\n([\s\S]*?)\n---/gm)].map((m) => m[1]!);
    expect(blocks).toHaveLength(3);
    for (const fm of blocks) {
      expect(fm).toMatch(/^palette: forest$/m);
    }
    expect(out).toMatch(/^theme: default$/m);
    expect(out).not.toMatch(/palette: candy/);
    expect(out).not.toMatch(/palette: neon/);
    expect(out).not.toMatch(/palette: ocean/);
  });
});
