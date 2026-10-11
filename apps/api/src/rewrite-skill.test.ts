import { describe, expect, it } from "vitest";
import {
  composeOneSlideSkill,
  composeOneSlideUserPrompt,
  reviseOutlineSlidePrompt,
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

describe("rewrite-skill prompts", () => {
  it("revise prompt locks visual and scopes to one slide", () => {
    const p = reviseOutlineSlidePrompt({
      topic: "Тема",
      locale: "ru",
      audience: "school",
      slideIndex: 3,
      previous: sampleSlide,
      instruction: "сделай крупнее цифры",
      isHero: false,
      locked: {
        layout: "stats",
        variant: "",
        image: "",
        visual: "stats",
      },
    });
    expect(p).toMatch(/ОДИН слайд/);
    expect(p).toMatch(/сделай крупнее цифры/);
    expect(p).toMatch(/Номер слайда: 3/);
    expect(p).toMatch(/visual ОБЯЗАН остаться ровно «stats»/);
    expect(p).not.toMatch(/сделай timeline/);
  });

  it("compose-one skill forbids layout change and forced photo pipeline", () => {
    const s = composeOneSlideSkill("default", "ru");
    expect(s).toMatch(/slidev-get-slide/);
    expect(s).toMatch(/slidev-update-slide ONLY/i);
    expect(s).toMatch(/Do NOT insert/);
    expect(s).toMatch(/HARD LOCK/);
    expect(s).toMatch(/Do NOT call hero-list/);
    expect(s).toMatch(/only asked for text/);
  });

  it("compose-one user prompt pins slide index and locked layout", () => {
    const p = composeOneSlideUserPrompt({
      slideIndex: 1,
      slide: { ...sampleSlide, visual: "hero" },
      locale: "ru",
      topic: "Тема",
      instruction: "История Легенды Яндекса замени на История Легенды",
      locked: lockedHero,
    });
    expect(p).toMatch(/slide 1/);
    expect(p).toMatch(/no=1/);
    expect(p).toMatch(/LOCKED: layout=hero variant=ribbon/);
    expect(p).toMatch(/Do not change layout or variant/);
    expect(p).not.toMatch(/FIRST call hero-list/i);
  });

  it("repair prompt keeps layout lock", () => {
    const p = rewriteRepairPrompt({
      slideIndex: 1,
      error: "LayoutError[hero]",
      md: "---\nlayout: hero\n---\n",
      locked: lockedHero,
    });
    expect(p).toMatch(/Сохрани layout=hero variant=ribbon/);
    expect(p).not.toMatch(/hero-list/);
  });
});
