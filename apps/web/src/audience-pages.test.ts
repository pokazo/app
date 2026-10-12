import { describe, expect, it } from "vitest";
import { sanitizeAudience } from "./audience-pages";

describe("sanitizeAudience", () => {
  it("keeps landing path slugs", () => {
    expect(sanitizeAudience("shkola")).toBe("shkola");
    expect(sanitizeAudience("urok")).toBe("urok");
  });

  it("defaults to school", () => {
    expect(sanitizeAudience(undefined)).toBe("school");
    expect(sanitizeAudience("nope")).toBe("school");
  });
});
