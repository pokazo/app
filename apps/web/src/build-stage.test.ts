import { describe, expect, it } from "vitest";
import { BUILD_PHASES, buildPhaseIndex, buildWaitMode } from "./build-stage";

describe("buildPhaseIndex", () => {
  it("walks the real activity phrases in pipeline order", () => {
    expect(buildPhaseIndex("")).toBe(0);
    expect(buildPhaseIndex("Думаю…")).toBe(0);
    expect(buildPhaseIndex("Выбираю тему")).toBe(0);
    expect(buildPhaseIndex("Ищу факты")).toBe(1);
    expect(buildPhaseIndex("Качаю фото")).toBe(1);
    expect(buildPhaseIndex("Рисую фон")).toBe(1);
    expect(buildPhaseIndex("Планирую слайды")).toBe(2);
    expect(buildPhaseIndex("Считаю слайды")).toBe(2);
    expect(buildPhaseIndex("Пишу план")).toBe(2);
    expect(buildPhaseIndex("Делаю обложку")).toBe(3);
    expect(buildPhaseIndex("Собираю превью")).toBe(3);
    expect(buildPhaseIndex("Пишу слайды")).toBe(4);
    expect(buildPhaseIndex("Верстаю слайд")).toBe(4);
    expect(buildPhaseIndex("Чиню слайды")).toBe(4);
    expect(buildPhaseIndex("Собираю показ")).toBe(5);
    expect(BUILD_PHASES).toHaveLength(6);
  });
});

describe("buildWaitMode", () => {
  const base = {
    busy: true,
    presenting: false,
    hasError: false,
    slideCount: 0,
    rewriteForm: false,
  };

  it("fills the stage until the first slide, then keeps a bar", () => {
    expect(buildWaitMode(base)).toBe("scene");
    expect(buildWaitMode({ ...base, slideCount: 3 })).toBe("bar");
  });

  it("stays quiet once the deck is idle, presenting, or in the rewrite form", () => {
    expect(buildWaitMode({ ...base, busy: false })).toBe("off");
    expect(buildWaitMode({ ...base, presenting: true })).toBe("off");
    expect(buildWaitMode({ ...base, hasError: true })).toBe("off");
    expect(buildWaitMode({ ...base, slideCount: 4, rewriteForm: true })).toBe("off");
  });
});
