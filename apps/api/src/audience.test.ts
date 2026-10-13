import { describe, expect, it } from "vitest";
import { audienceForPrompt, sanitizeAudience } from "./audience.js";

describe("sanitizeAudience", () => {
  it("keeps landing path slugs", () => {
    expect(sanitizeAudience("shkola")).toBe("shkola");
    expect(sanitizeAudience("Urok")).toBe("urok");
    expect(sanitizeAudience("biznes")).toBe("biznes");
  });

  it("falls back to general (not school)", () => {
    expect(sanitizeAudience("")).toBe("general");
    expect(sanitizeAudience("hack")).toBe("general");
    expect(sanitizeAudience(null)).toBe("general");
  });

  it("keeps explicit school only when requested", () => {
    expect(sanitizeAudience("school")).toBe("school");
    expect(sanitizeAudience("shkola")).toBe("shkola");
  });
});

describe("audienceForPrompt", () => {
  it("mentions entry path for landing slugs", () => {
    expect(audienceForPrompt("shkola")).toMatch(/\/shkola/);
    expect(audienceForPrompt("urok")).toMatch(/\/urok/);
    expect(audienceForPrompt("studenty")).toMatch(/\/studenty/);
  });

  it("general does not assume school", () => {
    expect(audienceForPrompt("general")).toMatch(/не предполагай школу/i);
    expect(audienceForPrompt("")).toMatch(/не предполагай школу/i);
  });

  it("expands legacy codes without inventing a path", () => {
    expect(audienceForPrompt("school")).toMatch(/школ/i);
    expect(audienceForPrompt("business")).toMatch(/бизнес/i);
    expect(audienceForPrompt("investors")).toMatch(/инвестор/i);
  });
});
