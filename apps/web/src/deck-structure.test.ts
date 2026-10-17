import { describe, expect, it } from "vitest";
import { focusAfterStructure, structureErrorMessage } from "./deck-structure";

describe("focusAfterStructure", () => {
  it("clamps to valid range", () => {
    expect(focusAfterStructure(3, 5)).toBe(3);
    expect(focusAfterStructure(0, 5)).toBe(1);
    expect(focusAfterStructure(9, 5)).toBe(5);
  });
});

describe("structureErrorMessage", () => {
  it("maps known API errors", () => {
    expect(structureErrorMessage("min slides")).toMatch(/минимум 3/);
    expect(structureErrorMessage("max slides")).toMatch(/максимум 16/);
    expect(structureErrorMessage("bad slide")).toMatch(/сдвинуть/);
  });
});
