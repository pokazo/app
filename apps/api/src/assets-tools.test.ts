import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStockTools } from "./assets-tools.js";

describe("createStockTools", () => {
  it("still exposes tools when access key missing (stub errors)", async () => {
    const tools = createStockTools("/tmp/deck", { accessKey: "" });
    expect(Object.keys(tools).sort()).toEqual(["stock-download", "stock-search"]);
    const search = tools["stock-search"] as {
      execute: (args: { query: string }, opts: unknown) => Promise<unknown>;
    };
    const result = await search.execute({ query: "office" }, { toolCallId: "1", messages: [] });
    expect(result).toMatchObject({ error: expect.stringMatching(/UNSPLASH/i) });
  });

  it("stock-search returns description fields for relevance", async () => {
    const tools = createStockTools("/tmp/deck", {
      accessKey: "key",
      search: async () => [
        {
          id: "x1",
          url: "https://example.com/x.jpg",
          thumb: "https://example.com/x-t.jpg",
          width: 10,
          height: 10,
          photographer: "Pat",
          attributionUrl: "https://unsplash.com/@pat",
          description: "Yellow Lada Niva on a driveway",
          altDescription: "vintage suv rear view",
        },
      ],
    });
    const search = tools["stock-search"] as {
      execute: (args: { query: string }, opts: unknown) => Promise<unknown>;
    };
    const result = await search.execute({ query: "UAZ Patriot" }, { toolCallId: "1", messages: [] });
    expect(result).toEqual([
      expect.objectContaining({
        id: "x1",
        description: "Yellow Lada Niva on a driveway",
        altDescription: "vintage suv rear view",
      }),
    ]);
  });

  it("stock-search returns structured error instead of throwing", async () => {
    const tools = createStockTools("/tmp/deck", {
      accessKey: "key",
      search: async () => {
        throw new Error("unsplash search 503");
      },
    });
    const search = tools["stock-search"] as {
      execute: (args: { query: string }, opts: unknown) => Promise<unknown>;
    };
    const result = await search.execute({ query: "desk" }, { toolCallId: "1", messages: [] });
    expect(result).toMatchObject({ error: expect.stringMatching(/503/) });
  });

  it("stock-download writes under public via injected deps", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "pokazo-tools-"));
    const tools = createStockTools(workDir, {
      accessKey: "key",
      search: async () => [
        {
          id: "abc",
          url: "https://example.com/a.jpg",
          thumb: "https://example.com/a-t.jpg",
          width: 100,
          height: 80,
          photographer: "Ada",
          attributionUrl: "https://unsplash.com/@ada",
          description: "glass atrium",
          altDescription: "office interior",
        },
      ],
      download: async (opts) => {
        const { downloadStockToPublic } = await import("./assets-stock.js");
        return downloadStockToPublic({
          ...opts,
          fetchImpl: async () => new Response(new Uint8Array([9, 9]), { status: 200 }),
        });
      },
    });
    expect(Object.keys(tools).sort()).toEqual(["stock-download", "stock-search"]);
    const dl = tools["stock-download"] as {
      execute: (args: { id?: string; url?: string; filename: string }, opts: unknown) => Promise<unknown>;
    };
    const result = (await dl.execute(
      { url: "https://example.com/a.jpg", filename: "hero.jpg" },
      { toolCallId: "1", messages: [] },
    )) as { path: string };
    expect(result.path).toBe("/hero.jpg");
    const bytes = await readFile(join(workDir, "public", "hero.jpg"));
    expect([...bytes]).toEqual([9, 9]);
  });
});
