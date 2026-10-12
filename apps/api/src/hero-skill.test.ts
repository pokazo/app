import { describe, expect, it } from "vitest";
import { HERO_VARIANTS, heroMaxSteps, heroSkill, heroUserPrompt } from "./hero-skill.js";
import {
  HERO_VARIANT_SHOT_ORDER,
  heroFixturePng,
  heroVariantsMarkdown,
} from "./layout-fixtures.js";

describe("HERO_VARIANTS", () => {
  it("includes five variants and excludes split/interactive/centered/editorial", () => {
    expect(HERO_VARIANTS).toEqual([
      "ribbon",
      "corner",
      "inset",
      "fullbleed",
      "product",
    ]);
    expect(HERO_VARIANTS).not.toContain("split");
    expect(HERO_VARIANTS).not.toContain("interactive");
    expect(HERO_VARIANTS).not.toContain("centered");
    expect(HERO_VARIANTS).not.toContain("editorial");
  });

  it("maps to screenshot golden names", () => {
    expect(HERO_VARIANT_SHOT_ORDER).toEqual([
      "hero-ribbon",
      "hero-corner",
      "hero-inset",
      "hero-fullbleed",
      "hero-product",
    ]);
  });

  it("heroVariantsMarkdown covers every variant once", () => {
    const md = heroVariantsMarkdown();
    for (const v of HERO_VARIANTS) {
      expect(md).toMatch(new RegExp(`variant: ${v}`));
    }
    expect(md.match(/layout: hero/g)?.length).toBe(5);
  });

  it("heroFixturePng is a valid PNG", () => {
    const png = heroFixturePng(32, 18);
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(png.length).toBeGreaterThan(64);
  });
});

describe("heroSkill", () => {
  it("teaches hero MCP catalog then photo then update", () => {
    const skill = heroSkill("seriph", "ru");
    expect(skill).toMatch(/hero-list/);
    expect(skill).toMatch(/hero-get/);
    expect(skill).toMatch(/Call hero-list BEFORE choosing/i);
    expect(skill).toMatch(/fields\[\]/);
    expect(skill).toMatch(/Hero block fields/i);
    expect(skill).toMatch(/overflow:hidden/);
    expect(skill).toMatch(/ribbon \| corner \| inset \| fullbleed \| product/);
    expect(skill).toMatch(/never use split, interactive, or centered/i);
    expect(skill).toMatch(/upload-image-search/);
    expect(skill).toMatch(/upload-image-use/);
    expect(skill).toMatch(/upload-image-search[\s\S]*yandex-image-search[\s\S]*stock-search/i);
    expect(skill).toMatch(/yandex-image-search/);
    expect(skill).toMatch(/stock-search/);
    expect(skill).toMatch(/image-generate/);
    expect(skill).toMatch(/slidev-update-slide/);
    expect(skill).toMatch(/Do NOT call slidev-get-info/i);
    expect(skill).toMatch(/Russian/);
  });
});

describe("heroUserPrompt", () => {
  it("requires hero-list before photo pipeline", () => {
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
    expect(prompt).toMatch(/FIRST call hero-list/i);
    expect(prompt).toMatch(/fields\[\]/);
    expect(prompt).toMatch(/clipped titles/i);
    expect(prompt).toMatch(
      /ribbon \| corner \| inset \| fullbleed \| product/,
    );
    expect(prompt).toMatch(/Never use split/i);
    expect(prompt).toMatch(/centered/);
    expect(prompt).toMatch(/yandex-image-search/);
  });
});

describe("heroMaxSteps", () => {
  it("budget covers catalog + search + download + update", () => {
    expect(heroMaxSteps()).toBeGreaterThanOrEqual(10);
    expect(heroMaxSteps()).toBeLessThanOrEqual(14);
  });
});
