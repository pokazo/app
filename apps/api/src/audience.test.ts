import { describe, expect, it } from "vitest";
import { audienceForPrompt, sanitizeAudience } from "./audience.js";

describe("sanitizeAudience", () => {
  it("keeps landing path slugs", () => {
    expect(sanitizeAudience("shkola")).toBe("shkola");
    expect(sanitizeAudience("Urok")).toBe("urok");
    expect(sanitizeAudience("biznes")).toBe("biznes");
  });

  it("falls back to school", () => {
    expect(sanitizeAudience("")).toBe("school");
    expect(sanitizeAudience("hack")).toBe("school");
    expect(sanitizeAudience(null)).toBe("school");
  });
});

describe("audienceForPrompt", () => {
  it("mentions entry path for landing slugs", () => {
    expect(audienceForPrompt("shkola")).toMatch(/\/shkola/);
    expect(audienceForPrompt("urok")).toMatch(/\/urok/);
    expect(audienceForPrompt("studenty")).toMatch(/\/studenty/);
  });

  it("expands legacy codes without inventing a path", () => {
    expect(audienceForPrompt("school")).toMatch(/школ/i);
    expect(audienceForPrompt("business")).toMatch(/бизнес/i);
    expect(audienceForPrompt("investors")).toMatch(/инвестор/i);
  });
});
