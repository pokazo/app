import { describe, expect, it, vi } from "vitest";
import { createResearchTools } from "./research-tools.js";

describe("createResearchTools", () => {
  it("returns error when keys are missing", async () => {
    const tools = createResearchTools({ apiKey: "", folderId: "" });
    const webSearch = tools["web-search"] as {
      execute: (args: { query: string }, opts: unknown) => Promise<{ error?: string }>;
    };
    const result = await webSearch.execute({ query: "test" }, { toolCallId: "1", messages: [] });
    expect(result.error).toMatch(/not configured/i);
  });

  it("returns mapped hits from search fn and counts calls", async () => {
    const onSearch = vi.fn();
    const search = vi.fn(async () => [
      {
        position: 1,
        url: "https://example.com",
        domain: "example.com",
        title: "Title",
        snippet: "Snippet",
        passages: ["Snippet"],
      },
    ]);
    const tools = createResearchTools({
      apiKey: "k",
      folderId: "f",
      search,
      onSearch,
    });
    const webSearch = tools["web-search"] as {
      execute: (
        args: { query: string; maxResults?: number },
        opts: unknown,
      ) => Promise<{
        totalResults: number;
        results: Array<{ title: string; url: string }>;
      }>;
    };
    const result = await webSearch.execute(
      { query: "УАЗ", maxResults: 5, region: 225 },
      { toolCallId: "1", messages: [] },
    );
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "k",
        folderId: "f",
        query: "УАЗ",
        maxResults: 5,
        region: 225,
      }),
    );
    expect(onSearch).toHaveBeenCalledOnce();
    expect(result.totalResults).toBe(1);
    expect(result.results[0]).toMatchObject({ title: "Title", url: "https://example.com" });
  });
});
