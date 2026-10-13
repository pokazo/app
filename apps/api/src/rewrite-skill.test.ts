import { describe, expect, it } from "vitest";
import {
  composeOneSlideSkill,
  composeOneSlideUserPrompt,
  reviseOutlineSlidePrompt,
  rewriteHeroRepairPrompt,
  rewriteHeroSkill,
  rewriteHeroUserPrompt,
  rewriteRepairPrompt,
} from "./rewrite-skill.js";

const sampleSlide = {
  heading: "Рынок",
  points: ["A", "B"],
  intent: "show market",
  visual: "stats" as const,
  imageQuery: "",
  iconHint: "",
  kicker: "",
  source: "",
  steps: [],
  stats: [
    { value: "10", label: "X", note: "" },
    { value: "20", label: "Y", note: "" },
  ],
  skills: [],
  cards: [],
  features: [],
  process: [],
};

const lockedHero = {
  layout: "hero",
  variant: "ribbon",
  image: "/slide-1.jpg",
  visual: "hero" as const,
};

const lockedStats = {
  layout: "stats",
  variant: "",
  image: "",
  visual: "stats" as const,
};

describe("rewrite-skill prompts", () => {
  it("revise body prompt soft-locks visual and allows layout change", () => {
    const p = reviseOutlineSlidePrompt({
      topic: "Тема",
      locale: "ru",
      audience: "school",
      slideIndex: 3,
      previous: sampleSlide,
      instruction: "сделай крупнее цифры",
      isHero: false,
      locked: lockedStats,
    });
    expect(p).toMatch(/ОДИН слайд/);
    expect(p).toMatch(/сделай крупнее цифры/);
    expect(p).toMatch(/Номер слайда: 3/);
    expect(p).toMatch(/По умолчанию сохрани visual=stats/);
    expect(p).toMatch(/Меняй visual\/layout ТОЛЬКО если/);
    expect(p).not.toMatch(/visual ОБЯЗАН остаться ровно «stats»/);
  });

  it("revise hero prompt keeps hero/cover visual", () => {
    const p = reviseOutlineSlidePrompt({
      topic: "Тема",
      locale: "ru",
      audience: "school",
      slideIndex: 1,
      previous: { ...sampleSlide, visual: "hero" },
      instruction: "короче заголовок",
      isHero: true,
      locked: lockedHero,
    });
    expect(p).toMatch(/visual ОБЯЗАН остаться hero или cover/);
  });

  it("compose-one body skill allows layout MCP and forbids hero tools", () => {
    const s = composeOneSlideSkill("default", "ru");
    expect(s).toMatch(/slidev-get-slide/);
    expect(s).toMatch(/slidev-update-slide ONLY/i);
    expect(s).toMatch(/layout-list/);
    expect(s).toMatch(/layout-get/);
    expect(s).toMatch(/soft lock/i);
    expect(s).toMatch(/do NOT call hero-list/i);
    expect(s).toMatch(/Do NOT insert/);
    expect(s).toMatch(/only asked for text/);
    expect(s).not.toMatch(/HARD LOCK/);
  });

  it("compose-one user prompt soft-locks current body layout", () => {
    const p = composeOneSlideUserPrompt({
      slideIndex: 3,
      slide: sampleSlide,
      locale: "ru",
      topic: "Тема",
      instruction: "Поменяй картинку на атоммаш",
      locked: {
        layout: "image-right",
        variant: "",
        image: "/slide-4.jpg",
        visual: "image-right",
      },
    });
    expect(p).toMatch(/slide 3/);
    expect(p).toMatch(/no=3/);
    expect(p).toMatch(/CURRENT: layout=image-right/);
    expect(p).toMatch(/Never use hero\/cover/);
    expect(p).toMatch(/Поменяй картинку на атоммаш/);
  });

  it("body repair prompt forbids hero tools", () => {
    const p = rewriteRepairPrompt({
      slideIndex: 3,
      error: "LayoutError[image-right]",
      md: "---\nlayout: image-right\n---\n",
      locked: {
        layout: "image-right",
        variant: "",
        image: "/slide-4.jpg",
        visual: "image-right",
      },
    });
    expect(p).toMatch(/layout-get/);
    expect(p).toMatch(/Не вызывай hero-list/);
  });

  it("hero rewrite skill uses hero catalog and forbids layout MCP", () => {
    const s = rewriteHeroSkill("default", "ru");
    expect(s).toMatch(/hero-list/);
    expect(s).toMatch(/hero-get/);
    expect(s).toMatch(/slidev-update-slide/);
    expect(s).toMatch(/do NOT call layout-list/i);
    expect(s).toMatch(/Keep layout: hero forever/);
    expect(s).toMatch(/yandex-image-search/);
  });

  it("hero rewrite user prompt pins slide 1 and soft-locks variant", () => {
    const p = rewriteHeroUserPrompt({
      slide: { ...sampleSlide, visual: "hero", heading: "Город" },
      locale: "ru",
      topic: "Волгодонск",
      instruction: "Поменяй картинку на набережную",
      locked: lockedHero,
    });
    expect(p).toMatch(/slide 1/);
    expect(p).toMatch(/variant=ribbon/);
    expect(p).toMatch(/Keep layout: hero/);
    expect(p).toMatch(/Поменяй картинку на набережную/);
  });

  it("hero repair keeps hero layout", () => {
    const p = rewriteHeroRepairPrompt({
      error: "LayoutError[hero]",
      md: "---\nlayout: hero\nvariant: ribbon\n---\n",
      locked: lockedHero,
    });
    expect(p).toMatch(/layout: hero/);
    expect(p).toMatch(/variant=ribbon/);
    expect(p).toMatch(/Не вызывай layout-list/);
  });
});
