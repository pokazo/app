import { describe, expect, it, vi } from "vitest";
import { RESEARCH_UNAVAILABLE_MARKDOWN } from "./research-skill.js";
import { runTopicResearch } from "./research.js";

describe("runTopicResearch", () => {
  it("returns unavailable markdown when keys missing", async () => {
    const generateTextFn = vi.fn();
    const result = await runTopicResearch({
      topic: "УАЗ",
      locale: "ru",
      audience: "school",
      apiKey: "",
      folderId: "",
      model: {},
      generateTextFn: generateTextFn as never,
    });
    expect(generateTextFn).not.toHaveBeenCalled();
    expect(result.used).toBe(false);
    expect(result.markdown).toBe(RESEARCH_UNAVAILABLE_MARKDOWN);
  });

  it("runs generateText with tools and returns markdown", async () => {
    const generateTextFn = vi.fn(async () => ({
      text: "# Research: УАЗ\n\n## Вердикт для плана\n\n- ok\n",
      usage: { promptTokens: 10, completionTokens: 20 },
    }));
    const search = vi.fn(async () => []);
    const result = await runTopicResearch({
      topic: "УАЗ",
      locale: "ru",
      audience: "school",
      apiKey: "k",
      folderId: "f",
      model: { id: "mock" },
      generateTextFn: generateTextFn as never,
      search,
      maxSteps: 8,
    });
    expect(generateTextFn).toHaveBeenCalledOnce();
    const args = generateTextFn.mock.calls[0][0] as {
      system: string;
      prompt: string;
      maxSteps: number;
      tools: Record<string, unknown>;
    };
    expect(args.system).toMatch(/web-search/);
    expect(args.prompt).toMatch(/УАЗ/);
    expect(args.maxSteps).toBe(8);
    expect(args.tools["web-search"]).toBeTruthy();
    expect(result.used).toBe(true);
    expect(result.markdown).toMatch(/Research: УАЗ/);
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 20 });
  });

  it("throws when model returns empty text", async () => {
    const generateTextFn = vi.fn(async () => ({ text: "   ", usage: {} }));
    await expect(
      runTopicResearch({
        topic: "X",
        locale: "ru",
        audience: "school",
        apiKey: "k",
        folderId: "f",
        model: {},
        generateTextFn: generateTextFn as never,
      }),
    ).rejects.toThrow(/empty markdown/i);
  });
});
