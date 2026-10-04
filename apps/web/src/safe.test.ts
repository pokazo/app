import { describe, expect, it } from "vitest";
import { isSafePath } from "./safe";

describe("isSafePath", () => {
  it("blocks open redirect", () => {
    expect(isSafePath("https://evil.com")).toBe("/app");
  });
});
