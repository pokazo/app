import { describe, expect, it } from "vitest";
import { isTypingTarget, shouldAdvanceKey, shouldRetreatKey } from "./deck-present";

describe("isTypingTarget", () => {
  it("ignores null and non-elements", () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget("x" as unknown as EventTarget)).toBe(false);
  });

  it("detects form fields and contentEditable", () => {
    expect(isTypingTarget({ tagName: "INPUT" } as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "TEXTAREA" } as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "SELECT" } as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true } as EventTarget)).toBe(true);
    expect(isTypingTarget({ tagName: "BUTTON" } as EventTarget)).toBe(false);
  });
});

describe("shouldAdvanceKey / shouldRetreatKey", () => {
  it("advances on Space and forward keys", () => {
    expect(shouldAdvanceKey(" ")).toBe(true);
    expect(shouldAdvanceKey("Spacebar")).toBe(true);
    expect(shouldAdvanceKey("ArrowRight")).toBe(true);
    expect(shouldAdvanceKey("PageDown")).toBe(true);
    expect(shouldAdvanceKey("ArrowLeft")).toBe(false);
  });

  it("retreats on left / PageUp", () => {
    expect(shouldRetreatKey("ArrowLeft")).toBe(true);
    expect(shouldRetreatKey("PageUp")).toBe(true);
    expect(shouldRetreatKey(" ")).toBe(false);
    expect(shouldRetreatKey("ArrowRight")).toBe(false);
  });
});
