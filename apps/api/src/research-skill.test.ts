import { describe, expect, it } from "vitest";
import {
  RESEARCH_UNAVAILABLE_MARKDOWN,
  researchSystemPrompt,
  researchUserPrompt,
} from "./research-skill.js";

describe("research-skill prompts", () => {
  it("system prompt requires web-search and markdown sections", () => {
    const sys = researchSystemPrompt("ru");
    expect(sys).toMatch(/web-search/);
    expect(sys).toMatch(/Вердикт для плана/);
    expect(sys).toMatch(/Факты/);
    expect(sys).toMatch(/Russian/);
  });

  it("user prompt carries topic and audience", () => {
    const user = researchUserPrompt({
      topic: "УАЗ Патриот",
      locale: "ru",
      audience: "business",
    });
    expect(user).toMatch(/УАЗ Патриот/);
    expect(user).toMatch(/бизнес/i);
    expect(user).toMatch(/web-search/);
  });

  it("expands landing path audience for prompts", () => {
    const user = researchUserPrompt({
      topic: "Фотосинтез",
      locale: "ru",
      audience: "shkola",
    });
    expect(user).toMatch(/\/shkola/);
    expect(user).toMatch(/школьн/i);
  });

  it("unavailable markdown mentions missing keys", () => {
    expect(RESEARCH_UNAVAILABLE_MARKDOWN).toMatch(/YANDEX_SEARCH_API_KEY/);
    expect(RESEARCH_UNAVAILABLE_MARKDOWN).toMatch(/search unavailable/i);
  });
});
