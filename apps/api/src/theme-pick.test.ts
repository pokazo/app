import { describe, expect, it, vi } from "vitest";
import { resolveDeckTheme, ThemePick } from "./theme-pick.js";
import { themePickSystemPrompt, themePickUserPrompt } from "./theme-pick-skill.js";
import { SELECTABLE_THEME_IDS } from "./themes.js";

describe("theme pick skill", () => {
  it("lists every selectable theme id and forbids auto", () => {
    const system = themePickSystemPrompt();
    for (const id of SELECTABLE_THEME_IDS) {
      expect(system).toContain(`- ${id}:`);
    }
    expect(system).not.toContain("- auto:");
    expect(system).toContain('never return "auto"');
  });

  it("embeds topic audience locale and research brief", () => {
    const prompt = themePickUserPrompt({
      topic: "УАЗ Патриот",
      locale: "ru",
      audience: "general",
      researchMarkdown: "## Brief\nВнедорожник для семьи, тёплый тон.",
    });
    expect(prompt).toContain("УАЗ Патриот");
    expect(prompt).toContain("ru");
    expect(prompt).toMatch(/не предполагай школу/i);
    expect(prompt).toContain("Research brief:");
    expect(prompt).toContain("Внедорожник для семьи");
    expect(prompt).toContain("using the research brief");
  });

  it("mentions research-after rule and forbids school default", () => {
    const system = themePickSystemPrompt();
    expect(system).toContain("AFTER topic research");
    expect(system).toContain("not from a URL path");
    expect(system).toContain("never as a default");
  });
});

describe("resolveDeckTheme", () => {
  it("passthrough when user already picked a concrete theme", async () => {
    const generateObjectFn = vi.fn();
    const out = await resolveDeckTheme({
      requested: "seriph",
      topic: "Science talk",
      locale: "en",
      audience: "university",
      generateObjectFn,
    });
    expect(out).toEqual({
      theme: "seriph",
      reason: "user-selected",
      via: "passthrough",
    });
    expect(generateObjectFn).not.toHaveBeenCalled();
  });

  it("treats unknown ids as auto and calls LLM", async () => {
    const generateObjectFn = vi.fn(async () => ({
      object: { theme: "default", reason: "универсально" },
    }));
    const out = await resolveDeckTheme({
      requested: "nope",
      topic: "X",
      locale: "ru",
      audience: "general",
      generateObjectFn,
    });
    expect(out.via).toBe("llm");
    expect(out.theme).toBe("default");
    expect(generateObjectFn).toHaveBeenCalledTimes(1);
  });

  it("calls LLM when requested is auto and returns selectable theme", async () => {
    const generateObjectFn = vi.fn(async () => ({
      object: { theme: "bricks", reason: "Яркая тема для детей" },
    }));
    const out = await resolveDeckTheme({
      requested: "auto",
      topic: "Космос для 5 класса",
      locale: "ru",
      audience: "shkola",
      researchMarkdown: "Школьники 5 класса, яркие факты про планеты.",
      generateObjectFn,
    });
    expect(out).toEqual({
      theme: "bricks",
      reason: "Яркая тема для детей",
      via: "llm",
    });
    expect(generateObjectFn).toHaveBeenCalledTimes(1);
    const args = generateObjectFn.mock.calls[0]![0];
    expect(args.schema).toBe(ThemePick);
    expect(args.system).toContain("bricks");
    expect(args.prompt).toContain("Космос для 5 класса");
    expect(args.prompt).toContain("яркие факты про планеты");
    expect(args.prompt).toMatch(/\/shkola/);
  });

  it("falls back to default when LLM returns invalid theme", async () => {
    const generateObjectFn = vi.fn(async () => ({
      object: { theme: "neon-cyber", reason: "cool" },
    }));
    const out = await resolveDeckTheme({
      requested: "auto",
      topic: "X",
      locale: "ru",
      audience: "general",
      generateObjectFn,
    });
    expect(out).toEqual({
      theme: "default",
      reason: "fallback after pick error",
      via: "fallback",
    });
  });

  it("falls back when generateObject throws", async () => {
    const generateObjectFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const out = await resolveDeckTheme({
      requested: "auto",
      topic: "X",
      locale: "ru",
      audience: "general",
      generateObjectFn,
    });
    expect(out.via).toBe("fallback");
    expect(out.theme).toBe("default");
  });
});
