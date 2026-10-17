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

  it("preserves model-chosen palette on spotlight slides", () => {
    const out = guardMarkdown(
      `---\ntheme: default\nlayout: hero\n---\n\n# One\n\n---\nlayout: spotlight\npalette: ocean\nimage: /slide-2.png\n---\n\n# Spot`,
      "ink-dark",
    );
    const blocks = [...out.matchAll(/^---\n([\s\S]*?)\n---/gm)].map((m) => m[1]!);
    expect(blocks[0]).toMatch(/^palette: ink$/m);
    expect(blocks[1]).toMatch(/^palette: ocean$/m);
    expect(blocks[1]).toMatch(/^layout: spotlight$/m);
  });
});
