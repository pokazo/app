import { describe, expect, it } from "vitest";
import { sanitizeAudience } from "./audience-pages";

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
