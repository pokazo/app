import { describe, expect, it } from "vitest";
import { guardMarkdown } from "./md-guard.js";
import { sanitizePickerTheme, slidevThemeId } from "./themes.js";

describe("picker theme", () => {
  it("accepts official ids and auto", () => {
    expect(sanitizePickerTheme("seriph")).toBe("seriph");
    expect(sanitizePickerTheme("auto")).toBe("auto");
    expect(sanitizePickerTheme("nope")).toBe("auto");
  });

  it("maps auto to the default Slidev package", () => {
    expect(slidevThemeId("auto")).toBe("default");
    expect(slidevThemeId("bricks")).toBe("bricks");
    expect(slidevThemeId("nope")).toBe("default");
  });
});

describe("md-guard theme", () => {
  it("pins the chosen Slidev theme in headmatter", () => {
    const out = guardMarkdown(`---\ntheme: evil\ntitle: Hi\n---\n\n# Hi`, "seriph");
    expect(out).toMatch(/^theme: seriph$/m);
    expect(out).not.toMatch(/theme: evil/);
  });
});
