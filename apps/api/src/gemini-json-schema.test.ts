import { zodSchema } from "ai";
import { describe, expect, it } from "vitest";
import { Outline } from "./outline.js";
import {
  isGeminiStructuredModel,
  stripJsonSchemaKeywords,
  zodJsonSchemaForProvider,
} from "./gemini-json-schema.js";

describe("isGeminiStructuredModel", () => {
  it("detects OpenRouter google gemini ids", () => {
    expect(isGeminiStructuredModel("google/gemini-3.6-flash")).toBe(true);
    expect(isGeminiStructuredModel("openai/gpt-4.1-mini")).toBe(false);
  });
});

describe("zodJsonSchemaForProvider", () => {
  it("strips maxItems for Gemini outline schema", () => {
    const raw = JSON.stringify(zodSchema(Outline).jsonSchema);
    expect(raw).toContain("maxItems");

    const gemini = zodJsonSchemaForProvider(Outline, "google/gemini-3.6-flash");
    const text = JSON.stringify(gemini);
    expect(text).not.toContain("maxItems");
  });

  it("leaves schema unchanged for non-Gemini models", () => {
    const openai = zodJsonSchemaForProvider(Outline, "openai/gpt-4.1-mini");
    expect(JSON.stringify(openai)).toContain("maxItems");
  });
});

describe("stripJsonSchemaKeywords", () => {
  it("walks nested objects", () => {
    const node = { a: { maxItems: 5, b: [{ maxItems: 3 }] }, $schema: "x" };
    stripJsonSchemaKeywords(node);
    expect(node).toEqual({ a: { b: [{}] } });
  });
});
