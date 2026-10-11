import { describe, expect, it } from "vitest";
import { guardMarkdown, sanitizeHeroVariantFrontmatter } from "./md-guard.js";

describe("sanitizeHeroVariantFrontmatter", () => {
  it("keeps known variants", () => {
    for (const v of ["ribbon", "corner", "inset", "fullbleed", "editorial", "product"]) {
      expect(sanitizeHeroVariantFrontmatter(`variant: ${v}`)).toBe(`variant: ${v}`);
    }
  });

  it("rewrites split, interactive, and centered to fullbleed", () => {
    expect(sanitizeHeroVariantFrontmatter("variant: split")).toBe("variant: fullbleed");
    expect(sanitizeHeroVariantFrontmatter("variant: interactive")).toBe("variant: fullbleed");
    expect(sanitizeHeroVariantFrontmatter("variant: centered")).toBe("variant: fullbleed");
  });
});

describe("guardMarkdown hero variant", () => {
  it("pins known hero variants and rewrites banned ones", () => {
    expect(guardMarkdown(`---\nlayout: hero\nvariant: editorial\n---\n\n# H`)).toMatch(
      /variant: editorial/,
    );
    expect(guardMarkdown(`---\nlayout: hero\nvariant: split\n---\n\n# H`)).toMatch(
      /variant: fullbleed/,
    );
    expect(guardMarkdown(`---\nlayout: hero\nvariant: interactive\n---\n\n# H`)).toMatch(
      /variant: fullbleed/,
    );
  });
});
