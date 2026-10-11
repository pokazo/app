import { describe, expect, it } from "vitest";
import {
  composeSkill,
  composeUserPrompt,
  outlineRevisePrompt,
  outlineUserPrompt,
} from "./compose-skill.js";

describe("composeSkill", () => {
  it("does not expose hero catalog MCP", () => {
    const skill = composeSkill("default", "ru");
    expect(skill).not.toMatch(/hero-list/);
    expect(skill).not.toMatch(/hero-get/);
    expect(skill).not.toMatch(/pokazo-hero/);
  });

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
    expect(skill).toMatch(/finished hero/i);
    expect(skill).toMatch(/Never dump|ONLY through (MCP|tools)/i);
    expect(skill).toMatch(/Do NOT start with slidev-get-info/i);
    expect(skill).toMatch(/Do NOT call slidev-get-slide on every slide/i);
  });

  it("requires stock with relevance judgment and image-generate fallback", () => {
    const skill = composeSkill("shibainu", "ru");
    expect(skill).toMatch(/stock-download/);
    expect(skill).toMatch(/image-generate/);
    expect(skill).toMatch(/description\/altDescription|wrong subject/i);
    expect(skill).toMatch(/gpt-image-1-mini|low quality/i);
    expect(skill).toMatch(/image: \/slide-/);
    expect(skill).toMatch(
      /At most ONE upload-image-search, ONE yandex-image-search and ONE stock-search/i,
    );
    expect(skill).not.toMatch(/If stock tools return an error, fall back/i);
    expect(skill).toMatch(/Slide 1 is already a finished hero/i);
    expect(skill).toMatch(/at least 3 local image: paths total/i);
    expect(skill).not.toMatch(/high quality/i);
  });

  it("requires upload-first then Yandex then Unsplash then image-generate", () => {
    const skill = composeSkill("shibainu", "ru");
    expect(skill).toMatch(/upload-image-search/);
    expect(skill).toMatch(/upload-image-use/);
    expect(skill).toMatch(/yandex-image-search/);
    expect(skill).toMatch(/yandex-image-download/);
    expect(skill).toMatch(
      /upload-image-search[\s\S]*yandex-image-search[\s\S]*stock-search[\s\S]*image-generate/i,
    );
    expect(skill).toMatch(/suggestedId|IMMEDIATELY yandex-image-download|IMMEDIATELY upload-image-use/i);
    expect(skill).toMatch(/title\/domain\/pageUrl|wrong subject|caption/i);
  });

  it("teaches two-cols H1-before-columns and stats items frontmatter", () => {
    const skill = composeSkill("bricks", "ru");
    expect(skill).toMatch(/two-cols/);
    expect(skill).toMatch(/H1 title ABOVE ::left::/i);
    expect(skill).toMatch(/::right::/);
    expect(skill).toMatch(/no emoji/i);
    expect(skill).toMatch(/frontmatter items \(not stats\)/i);
  });

  it("teaches quote/fact/icon/cards layouts", () => {
    const skill = composeSkill("bricks", "ru");
    expect(skill).toMatch(/layout: quote/);
    expect(skill).toMatch(/layout: fact/);
    expect(skill).toMatch(/layout: icon/);
    expect(skill).toMatch(/layout: cards/);
    expect(skill).toMatch(/outline\.cards → items/i);
    expect(skill).toMatch(/Never use cards:/i);
  });

  it("lists Carbon iconHint allowlist so LLM does not invent names", () => {
    const skill = composeSkill("default", "ru");
    expect(skill).toMatch(/carbon-money/);
    expect(skill).toMatch(/carbon-user-multiple/);
    expect(skill).toMatch(/carbon-security/);
    expect(skill).toMatch(/Never invent|allowlist/i);
    const outline = outlineUserPrompt({
      topic: "Any topic",
      locale: "ru",
      audience: "investors",
      slideCount: 8,
    });
    expect(outline).toMatch(/carbon-money/);
    expect(outline).toMatch(/ТОЛЬКО из/i);
  });

  it("teaches LayoutError repair reaction", () => {
    const skill = composeSkill("default", "ru");
    expect(skill).toMatch(/LayoutError\[/);
    expect(skill).toMatch(/fix that slide/i);
  });
});

describe("outlineUserPrompt", () => {
  it("asks for several image-* slides with Russian imageQuery for locale=ru", () => {
    const prompt = outlineUserPrompt({
      topic: "Антон Бутов Kotlin",
      locale: "ru",
      audience: "school",
      slideCount: 8,
    });
    expect(prompt).toMatch(/image-right/);
    expect(prompt).toMatch(/image-left/);
    expect(prompt).toMatch(/imageQuery/);
    expect(prompt).toMatch(/на русском|Yandex Images/i);
    expect(prompt).toMatch(/минимум 3 слайда image-right или image-left/i);
    expect(prompt).toMatch(/запрещены visual none\|default/i);
    expect(prompt).toMatch(/пустого слайда/i);
    expect(prompt).toMatch(/конкретные факты/i);
    expect(prompt).toMatch(/visual=cards/);
    expect(prompt).toMatch(/cards — массив/);
  });

  it("embeds research brief when provided", () => {
    const prompt = outlineUserPrompt({
      topic: "УАЗ",
      locale: "ru",
      audience: "school",
      slideCount: 8,
      researchMarkdown: "# Research: УАЗ\n\n## Факты\n| 150 л.с. | https://ex.com |",
    });
    expect(prompt).toMatch(/Research brief/);
    expect(prompt).toMatch(/обязательный источник фактов/i);
    expect(prompt).toContain("150 л.с.");
    expect(prompt).toContain("https://ex.com");
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

  it("embeds research brief when provided", () => {
    const prompt = outlineRevisePrompt({
      topic: "Ростов",
      locale: "ru",
      audience: "school",
      slideCount: 8,
      previous: { title: "X", slides: [] },
      issues: "empty",
      researchMarkdown: "## Вердикт\n- факт A",
    });
    expect(prompt).toMatch(/Research brief/);
    expect(prompt).toContain("факт A");
    expect(prompt).toMatch(/из Research brief/i);
  });
});

describe("composeUserPrompt", () => {
  it("repeats upload → Yandex → Unsplash → generate fallback and leaves hero alone", () => {
    const prompt = composeUserPrompt({ title: "T", slides: [] }, "ru");
    expect(prompt).toMatch(/upload-image-search/);
    expect(prompt).toMatch(/yandex-image-search/);
    expect(prompt).toMatch(/stock-search/);
    expect(prompt).toMatch(/image-generate/);
    expect(prompt).toMatch(/suggestedId|empty\/wrong\/error/i);
    expect(prompt).toMatch(/At least 3/i);
    expect(prompt).toMatch(/Slide 1 \(hero\) уже готов/i);
    expect(prompt).toMatch(/outline\.cards → frontmatter items/i);
  });
});
