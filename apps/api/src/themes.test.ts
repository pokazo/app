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
  });
});

describe("md-guard theme", () => {
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
});
