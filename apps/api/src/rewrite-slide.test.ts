import { describe, expect, it, vi } from "vitest";
import { reviseOutlineSlide } from "./rewrite-slide.js";

const goodSlide = {
  heading: "Рынок",
  points: ["Рост 12%"],
  intent: "market",
  visual: "image-right" as const,
  imageQuery: "market chart",
  iconHint: "",
  kicker: "",
  source: "",
  steps: [],
  stats: [],
  skills: [],
  cards: [],
  features: [],
  process: [],
};

describe("reviseOutlineSlide", () => {
  it("returns generateObject result when valid", async () => {
    const generateObjectFn = vi.fn(async () => ({ object: goodSlide }));
    const out = await reviseOutlineSlide({
      topic: "Тема",
      locale: "ru",
      audience: "school",
      slideIndex: 2,
      previous: goodSlide,
      instruction: "добавь фото",
      isHero: false,
      generateObjectFn: generateObjectFn as never,
    });
    expect(out.heading).toBe("Рынок");
    expect(generateObjectFn).toHaveBeenCalledTimes(1);
  });

  it("retries once when first result is empty", async () => {
    const empty = { ...goodSlide, heading: "", points: [] };
    const generateObjectFn = vi
      .fn()
      .mockResolvedValueOnce({ object: empty })
      .mockResolvedValueOnce({ object: goodSlide });
    const out = await reviseOutlineSlide({
      topic: "Тема",
      locale: "ru",
      audience: "school",
      slideIndex: 2,
      previous: goodSlide,
      instruction: "исправь",
      isHero: false,
      generateObjectFn: generateObjectFn as never,
    });
    expect(out.heading).toBe("Рынок");
    expect(generateObjectFn).toHaveBeenCalledTimes(2);
  });
});
