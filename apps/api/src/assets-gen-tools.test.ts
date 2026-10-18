import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createImageGenTools } from "./assets-gen-tools.js";

describe("createImageGenTools", () => {
  it("keeps a 0ms stub when key is missing so the model cannot NoSuchToolError", async () => {
    const tools = createImageGenTools("/tmp/deck", { apiKey: "" });
    expect(Object.keys(tools)).toEqual(["image-generate"]);
    const gen = tools["image-generate"] as {
      execute: (args: { prompt: string; filename: string }, opts: unknown) => Promise<unknown>;
    };
    const result = await gen.execute(
      { prompt: "UAZ Patriot", filename: "slide-1-gen.png" },
      { toolCallId: "1", messages: [] },
    );
    expect(result).toMatchObject({ error: expect.stringMatching(/OPENAI_API_KEY/i) });
  });

  it("image-generate returns path via injected generate", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "pokazo-gentool-"));
    const attributions: unknown[] = [];
    const tools = createImageGenTools(workDir, {
      apiKey: "sk",
      generate: async ({ filename, prompt }) => ({
        path: `/${filename}`,
        file: join(workDir, "public", filename),
        attribution: { source: "openai" as const, model: "gpt-image-1-mini", prompt },
      }),
      onAttribution: (e) => attributions.push(e),
    });
    const gen = tools["image-generate"] as {
      execute: (args: { prompt: string; filename: string }, opts: unknown) => Promise<unknown>;
    };
    const result = await gen.execute(
      { prompt: "UAZ Patriot 2026 diesel SUV", filename: "slide-2-gen.png" },
      { toolCallId: "1", messages: [] },
    );
    expect(result).toEqual({
      path: "/slide-2-gen.png",
      attribution: {
        source: "openai",
        model: "gpt-image-1-mini",
        prompt: "UAZ Patriot 2026 diesel SUV",
      },
    });
    expect(attributions).toHaveLength(1);
  });
});
