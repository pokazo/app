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

  it("forces locked visual on hero rewrite even if model changes it", async () => {
    const generateObjectFn = vi.fn(async () => ({
      object: { ...goodSlide, visual: "timeline" as const },
    }));
    const out = await reviseOutlineSlide({
      topic: "Тема",
      locale: "ru",
      audience: "school",
      slideIndex: 1,
      previous: { ...goodSlide, visual: "hero" },
      instruction: "короче заголовок",
      isHero: true,
      locked: {
        layout: "hero",
        variant: "ribbon",
        image: "/slide-1.jpg",
        visual: "hero",
      },
      generateObjectFn: generateObjectFn as never,
    });
    expect(out.visual).toBe("hero");
  });

  it("allows body visual change when model revises layout", async () => {
    const generateObjectFn = vi.fn(async () => ({
      object: { ...goodSlide, visual: "timeline" as const, steps: [
        { phase: "1", title: "A", body: "a", state: "done" as const },
        { phase: "2", title: "B", body: "b", state: "current" as const },
        { phase: "3", title: "C", body: "c", state: "todo" as const },
      ] },
    }));
    const out = await reviseOutlineSlide({
      topic: "Тема",
      locale: "ru",
      audience: "school",
      slideIndex: 2,
      previous: goodSlide,
      instruction: "сделай timeline",
      isHero: false,
      locked: {
        layout: "image-right",
        variant: "",
        image: "/slide-2.jpg",
        visual: "image-right",
      },
      generateObjectFn: generateObjectFn as never,
    });
    expect(out.visual).toBe("timeline");
  });

  it("full-redo falls back to photo layout after two invalid structured attempts", async () => {
    const badFeatures = {
      ...goodSlide,
      visual: "features" as const,
      features: [
        { title: "A", body: "a", iconHint: "carbon-idea" },
        { title: "B", body: "b", iconHint: "carbon-star" },
      ],
    };
    const flipped = {
      ...goodSlide,
      visual: "image-left" as const,
      heading: "Новый ракурс",
      points: ["Один", "Два", "Три"],
      imageQuery: "volgodonsk canal aerial",
    };
    const generateObjectFn = vi
      .fn()
      .mockResolvedValueOnce({ object: badFeatures })
      .mockResolvedValueOnce({ object: badFeatures })
      .mockResolvedValueOnce({ object: flipped });
    const out = await reviseOutlineSlide({
      topic: "Волгодонск",
      locale: "ru",
      audience: "school",
      slideIndex: 2,
      previous: goodSlide,
      instruction: "полностью переделай, мне не нравится",
      isHero: false,
      locked: {
        layout: "image-right",
        variant: "",
        image: "/slide-2.jpg",
        visual: "image-right",
      },
      generateObjectFn: generateObjectFn as never,
    });
    expect(out.visual).toBe("image-left");
    expect(out.heading).toBe("Новый ракурс");
    expect(generateObjectFn).toHaveBeenCalledTimes(3);
    expect(String(generateObjectFn.mock.calls[2]?.[0]?.prompt ?? "")).toMatch(/FALLBACK FULL REDO/);
  });
});
