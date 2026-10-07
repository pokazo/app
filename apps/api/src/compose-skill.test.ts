import { describe, expect, it } from "vitest";
import {
  composeSkill,
  composeUserPrompt,
  outlineRevisePrompt,
  outlineUserPrompt,
} from "./compose-skill.js";

describe("composeSkill", () => {
  it("requires MCP + stock tools and sequential inserts", () => {
    const skill = composeSkill("seriph", "ru");
    expect(skill).toMatch(/stock-search/);
    expect(skill).toMatch(/stock-download/);
    expect(skill).toMatch(/slidev-insert-slide/);
    expect(skill).toMatch(/sequential/i);
    expect(skill).toMatch(/image-right/);
    expect(skill).toMatch(/Russian/);
    expect(skill).toMatch(/layout: timeline/);
    expect(skill).toMatch(/layout: stats/);
    expect(skill).toMatch(/layout: skills/);
    expect(skill).toMatch(/layout: hero/);
    expect(skill).toMatch(/Never dump|ONLY through (MCP|tools)/i);
  });

  it("requires Unsplash photos on image slides instead of skipping the deck", () => {
    const skill = composeSkill("shibainu", "ru");
    expect(skill).toMatch(/stock-download/);
    expect(skill).toMatch(/MUST call stock-search then stock-download/i);
    expect(skill).toMatch(/image: \/slide-/);
    expect(skill).toMatch(/retry once with a simpler English query/i);
    expect(skill).not.toMatch(/If stock tools return an error, fall back/i);
    expect(skill).not.toMatch(/when available/i);
    expect(skill).toMatch(/hero and cover also get a photo/i);
    expect(skill).toMatch(/at least 3 slides must have image:/i);
  });

  it("teaches two-cols H1-before-columns and stats items frontmatter", () => {
    const skill = composeSkill("bricks", "ru");
    expect(skill).toMatch(/two-cols/);
    expect(skill).toMatch(/H1 title ABOVE ::left::/i);
    expect(skill).toMatch(/::right::/);
    expect(skill).toMatch(/no emoji/i);
    expect(skill).toMatch(/frontmatter items \(not stats\)/i);
  });
});

describe("outlineUserPrompt", () => {
  it("asks for several image-* slides with English imageQuery", () => {
    const prompt = outlineUserPrompt({
      topic: "Антон Бутов Kotlin",
      locale: "ru",
      audience: "school",
      slideCount: 8,
    });
    expect(prompt).toMatch(/image-right/);
    expect(prompt).toMatch(/image-left/);
    expect(prompt).toMatch(/imageQuery/);
    expect(prompt).toMatch(/минимум 3 слайда image-right или image-left/i);
    expect(prompt).toMatch(/запрещены visual none\|default/i);
    expect(prompt).toMatch(/пустого слайда/i);
  });
});

describe("outlineRevisePrompt", () => {
  it("includes failing test reasons and previous plan for model revision", () => {
    const prompt = outlineRevisePrompt({
      topic: "Ростов",
      locale: "ru",
      audience: "school",
      slideCount: 8,
      previous: { title: "X", slides: [] },
      issues: "1. [text_only] Слайд 2 только текст",
    });
    expect(prompt).toMatch(/не прошёл проверки/i);
    expect(prompt).toContain("1. [text_only] Слайд 2 только текст");
    expect(prompt).toContain('"title":"X"');
    expect(prompt).toMatch(/Исправь/i);
  });
});

describe("composeUserPrompt", () => {
  it("orders stock-download before insert for every photo slide", () => {
    const prompt = composeUserPrompt(
      { title: "Demo", slides: [{ heading: "Hi", visual: "image-right", imageQuery: "laptop" }] },
      "ru",
    );
    expect(prompt).toMatch(/stock-search then stock-download BEFORE insert\/update/i);
    expect(prompt).toMatch(/Do not finish with zero local images/i);
    expect(prompt).toContain('"imageQuery":"laptop"');
    expect(prompt).toMatch(/locale=ru/);
  });
});
