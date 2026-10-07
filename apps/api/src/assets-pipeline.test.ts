import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStockTools } from "./assets-tools.js";
import { createImageGenTools } from "./assets-gen-tools.js";
import { mergeComposeTools } from "./generate-helpers.js";

describe("assets pipeline stock → generate", () => {
  it("exposes stock + image-generate together for compose", () => {
    const workDir = mkdtempSync(join(tmpdir(), "pokazo-pipe-"));
    const stock = createStockTools(workDir, { accessKey: "k" });
    const gen = createImageGenTools(workDir, { apiKey: "sk" });
    const merged = mergeComposeTools({ "slidev-list-slides": {} }, stock, gen);
    expect(Object.keys(merged).sort()).toEqual([
      "image-generate",
      "slidev-list-slides",
      "stock-download",
      "stock-search",
    ]);
  });

  it("off-topic stock descriptions are visible so compose can choose generate", async () => {
    const tools = createStockTools("/tmp/deck", {
      accessKey: "key",
      search: async () => [
        {
          id: "wrong",
          url: "https://example.com/niva.jpg",
          thumb: "https://example.com/niva-t.jpg",
          width: 1600,
          height: 1067,
          photographer: "X",
          attributionUrl: "https://unsplash.com",
          description: "Yellow Lada Niva parked under a house",
          altDescription: "vintage compact suv",
        },
      ],
    });
    const search = tools["stock-search"] as {
      execute: (args: { query: string }, opts: unknown) => Promise<unknown>;
    };
    const hits = (await search.execute(
      { query: "UAZ Patriot 2026" },
      { toolCallId: "1", messages: [] },
    )) as Array<{ description: string }>;
    expect(hits[0]?.description).toMatch(/Lada Niva/i);
  });
});
