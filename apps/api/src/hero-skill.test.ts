import { describe, expect, it } from "vitest";
import { HERO_VARIANTS, heroMaxSteps, heroSkill, heroUserPrompt } from "./hero-skill.js";

describe("HERO_VARIANTS", () => {
  it("includes four variants and excludes split/interactive", () => {
    expect(HERO_VARIANTS).toEqual(["centered", "fullbleed", "editorial", "product"]);
    expect(HERO_VARIANTS).not.toContain("split");
    expect(HERO_VARIANTS).not.toContain("interactive");
  });
});

describe("heroSkill", () => {
  it("teaches variants, tools, and slide-1-only updates", () => {
    const skill = heroSkill("seriph", "ru");
    expect(skill).toMatch(/centered/);
    expect(skill).toMatch(/fullbleed/);
    expect(skill).toMatch(/editorial/);
    expect(skill).toMatch(/product/);
    expect(skill).toMatch(/never use split/i);
    expect(skill).not.toMatch(/\bsplit\b.*50\/50|layout: split/i);
    expect(skill).toMatch(/yandex-image-search/);
    expect(skill).toMatch(/stock-search/);
    expect(skill).toMatch(/image-generate/);
    expect(skill).toMatch(/yandex-image-search[\s\S]*stock-search/i);
    expect(skill).toMatch(/suggestedId|IMMEDIATELY yandex-image-download/i);
    expect(skill).toMatch(/Do NOT call yandex-image-search more than once/i);
    expect(skill).toMatch(/slidev-update-slide/);
    expect(skill).toMatch(/Do NOT call slidev-get-info/i);
    expect(skill).toMatch(/Do NOT insert/i);
    expect(skill).toMatch(/variant:/);
    expect(skill).toMatch(/Russian/);
  });
});

describe("heroUserPrompt", () => {
  it("passes first outline slide and forbids split", () => {
    const prompt = heroUserPrompt({
      topic: "УАЗ",
      locale: "ru",
      outline: {
        title: "УАЗ",
        slides: [
          {
            heading: "УАЗ Патриот",
            points: ["внедорожник"],
            intent: "hook",
            visual: "hero",
            imageQuery: "UAZ Patriot offroad",
            iconHint: "",
            kicker: "ВНЕДОРОЖНИК",
            source: "",
            steps: [],
            stats: [],
            skills: [],
            cards: [],
          },
        ],
      },
    });
    expect(prompt).toContain("УАЗ Патриот");
    expect(prompt).toMatch(/centered \| fullbleed \| editorial \| product/);
    expect(prompt).toMatch(/Never use split/i);
    expect(prompt).toMatch(/yandex-image-search/);
  });
});

describe("heroMaxSteps", () => {
  it("is enough for search + download + update", () => {
    expect(heroMaxSteps()).toBeGreaterThanOrEqual(8);
    expect(heroMaxSteps()).toBeLessThanOrEqual(12);
  });
});
