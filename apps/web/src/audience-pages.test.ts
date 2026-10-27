import { describe, expect, it } from "vitest";
import { AUDIENCE_PAGES, sanitizeAudience } from "./audience-pages";

describe("sanitizeAudience", () => {
  it("keeps landing path slugs", () => {
    expect(sanitizeAudience("shkola")).toBe("shkola");
    expect(sanitizeAudience("urok")).toBe("urok");
  });

  it("defaults to general (school only via /shkola slug)", () => {
    expect(sanitizeAudience(undefined)).toBe("general");
    expect(sanitizeAudience("nope")).toBe("general");
    expect(sanitizeAudience("shkola")).toBe("shkola");
  });
});

describe("audience examples", () => {
  it("gives each path three distinct example thumbs", () => {
    for (const page of AUDIENCE_PAGES) {
      expect(page.examples).toHaveLength(3);
      const ids = page.examples.map((e) => e.id);
      expect(new Set(ids).size).toBe(3);
    }
  });
});
