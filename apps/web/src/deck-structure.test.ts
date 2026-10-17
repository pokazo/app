import { describe, expect, it } from "vitest";
import {
  focusAfterStructure,
  structureErrorMessage,
  thumbMoveTarget,
} from "./deck-structure";

describe("focusAfterStructure", () => {
  it("clamps to valid range", () => {
    expect(focusAfterStructure(3, 5)).toBe(3);
    expect(focusAfterStructure(0, 5)).toBe(1);
    expect(focusAfterStructure(9, 5)).toBe(5);
  });
});

describe("thumbMoveTarget", () => {
  it("moves up/down within bounds", () => {
    expect(thumbMoveTarget(2, "up", 5)).toBe(1);
    expect(thumbMoveTarget(2, "down", 5)).toBe(3);
  });

  it("returns null at edges", () => {
    expect(thumbMoveTarget(1, "up", 5)).toBe(null);
    expect(thumbMoveTarget(5, "down", 5)).toBe(null);
  });
});

describe("structureErrorMessage", () => {
  it("maps known API errors", () => {
    expect(structureErrorMessage("min slides")).toMatch(/минимум 3/);
    expect(structureErrorMessage("max slides")).toMatch(/максимум 16/);
    expect(structureErrorMessage("bad slide")).toMatch(/сдвинуть/);
  });
});
