import { afterEach, describe, expect, it } from "vitest";
import { envInt } from "./env.js";

describe("envInt", () => {
  const key = "POKAZO_TEST_ENV_INT";

  afterEach(() => {
    delete process.env[key];
  });

  it("uses fallback when unset", () => {
    expect(envInt(key, 8)).toBe(8);
  });

  it("parses and clamps", () => {
    process.env[key] = "12";
    expect(envInt(key, 8, { min: 1, max: 32 })).toBe(12);
    process.env[key] = "0";
    expect(envInt(key, 8, { min: 1, max: 32 })).toBe(1);
    process.env[key] = "99";
    expect(envInt(key, 8, { min: 1, max: 32 })).toBe(32);
  });

  it("falls back on NaN", () => {
    process.env[key] = "nope";
    expect(envInt(key, 8)).toBe(8);
  });
});
