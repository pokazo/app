import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { formatAiError } from "./format-ai-error.js";

describe("formatAiError", () => {
  it("includes status and OpenRouter body message for APICallError", () => {
    const err = new APICallError({
      message: "Provider returned error",
      url: "https://mcp.antonbutov.com/api/v1/chat/completions",
      requestBodyValues: {},
      statusCode: 400,
      responseBody: JSON.stringify({
        error: { message: "Invalid schema for function outline-validate", code: 400 },
      }),
      isRetryable: false,
    });
    const s = formatAiError(err);
    expect(s).toContain("AI_APICallError: Provider returned error");
    expect(s).toContain("status=400");
    expect(s).toContain("Invalid schema for function outline-validate");
    expect(s).toContain("url=/api/v1/chat/completions");
    expect(s).toContain("body=");
  });

  it("falls back to String(err) for plain Error", () => {
    expect(formatAiError(new Error("Outline plan failed validation"))).toBe(
      "Error: Outline plan failed validation",
    );
  });

  it("adds Gemini schema hint for INVALID_ARGUMENT from Google AI Studio", () => {
    const err = new APICallError({
      message: "Provider returned error",
      url: "https://mcp.antonbutov.com/api/v1/chat/completions",
      requestBodyValues: {},
      statusCode: 400,
      responseBody: JSON.stringify({
        error: {
          message: "Provider returned error",
          metadata: {
            raw: '{"error":{"status":"INVALID_ARGUMENT"}}',
            provider_name: "Google AI Studio",
          },
        },
      }),
      isRetryable: false,
    });
    expect(formatAiError(err)).toMatch(/Gemini отклонил JSON Schema/);
  });

  it("truncates to maxLen", () => {
    const err = new APICallError({
      message: "Provider returned error",
      url: "https://openrouter.ai/api/v1/chat/completions",
      requestBodyValues: {},
      statusCode: 400,
      responseBody: JSON.stringify({ error: { message: "x".repeat(3000) } }),
      isRetryable: false,
    });
    expect(formatAiError(err, 200).length).toBeLessThanOrEqual(200);
  });
});
