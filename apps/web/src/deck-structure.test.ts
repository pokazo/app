import { describe, expect, it } from "vitest";
import {
  focusAfterStructure,
  reorderSlidesByMove,
  structureErrorMessage,
  themeErrorMessage,
  thumbMoveTarget,
} from "./deck-structure";

describe("focusAfterStructure", () => {
  it("clamps to valid range", () => {
    expect(focusAfterStructure(3, 5)).toBe(3);
    expect(focusAfterStructure(0, 5)).toBe(1);
    expect(focusAfterStructure(9, 5)).toBe(5);
  });
});

describe("reorderSlidesByMove", () => {
  const slides = [
    { index: 1, heading: "a" },
    { index: 2, heading: "b" },
    { index: 3, heading: "c" },
  ];

  it("moves a page to another index and renumbers", () => {
    expect(reorderSlidesByMove(slides, 1, 3).map((s) => s.heading)).toEqual(["b", "c", "a"]);
    expect(reorderSlidesByMove(slides, 3, 1).map((s) => `${s.index}:${s.heading}`)).toEqual([
      "1:c",
      "2:a",
      "3:b",
    ]);
  });

  it("leaves the list alone when the move is a no-op", () => {
    expect(reorderSlidesByMove(slides, 2, 2)).toBe(slides);
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
    expect(structureErrorMessage("bad slide")).toMatch(/удалить/);
    expect(structureErrorMessage("bad move")).toMatch(/сдвинуть/);
  });
});

describe("themeErrorMessage", () => {
  it("maps retheme API errors", () => {
    expect(themeErrorMessage("bad theme")).toMatch(/конкретную тему/);
    expect(themeErrorMessage("busy")).toMatch(/сборка/);
    expect(themeErrorMessage("deck not ready")).toMatch(/не готова/);
  });
});
