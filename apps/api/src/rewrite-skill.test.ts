import { describe, expect, it } from "vitest";
import {
  composeOneSlideSkill,
  composeOneSlideUserPrompt,
  reviseOutlineSlidePrompt,
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

describe("rewrite-skill prompts", () => {
  it("revise prompt scopes to one slide and instruction", () => {
    const p = reviseOutlineSlidePrompt({
      topic: "Тема",
      locale: "ru",
      audience: "school",
      slideIndex: 3,
      previous: sampleSlide,
      instruction: "сделай timeline",
      isHero: false,
    });
    expect(p).toMatch(/ОДИН слайд/);
    expect(p).toMatch(/сделай timeline/);
    expect(p).toMatch(/Номер слайда: 3/);
    expect(p).toMatch(/stats/);
  });

  it("compose-one skill forbids insert/remove/move", () => {
    const s = composeOneSlideSkill("default", "ru");
    expect(s).toMatch(/slidev-get-slide/);
    expect(s).toMatch(/slidev-update-slide ONLY/i);
    expect(s).toMatch(/Do NOT insert/);
  });

  it("compose-one user prompt pins slide index", () => {
    const p = composeOneSlideUserPrompt({
      slideIndex: 4,
      slide: sampleSlide,
      locale: "ru",
      topic: "Тема",
      instruction: "крупнее цифра",
    });
    expect(p).toMatch(/slide 4/);
    expect(p).toMatch(/no=4/);
    expect(p).toMatch(/крупнее цифра/);
  });
});
