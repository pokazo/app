import { tool } from "ai";
import { z } from "zod";
import { searchYandex, type YandexSearchHit } from "./yandex-search.js";

export type ResearchSearchFn = (opts: {
  apiKey: string;
  folderId: string;
  query: string;
  maxResults?: number;
  region?: number;
}) => Promise<YandexSearchHit[]>;

export function createResearchTools(opts: {
  apiKey: string;
  folderId: string;
  search?: ResearchSearchFn;
  onSearch?: () => void;
}): Record<string, unknown> {
  const configured = Boolean(opts.apiKey && opts.folderId);
  const search =
    opts.search ??
    ((args) =>
      searchYandex({
        apiKey: args.apiKey,
        folderId: args.folderId,
        query: args.query,
        maxResults: args.maxResults,
        region: args.region,
      }));

  return {
    "web-search": tool({
      description:
        "Search the web via Yandex Search API. Prefer Russian queries for RU topics. Returns title, url, domain, snippet/passages. Call 3–6 times with different angles before writing the research brief.",
      parameters: z.object({
        query: z.string().describe("Search query (RU or EN)"),
        maxResults: z.number().int().min(1).max(10).optional(),
        region: z.number().int().optional().describe("Region id, e.g. 213 for Moscow"),
      }),
      execute: async ({ query, maxResults, region }) => {
        if (!configured) {
          return { error: "YANDEX_SEARCH_API_KEY / YANDEX_FOLDER_ID not configured" };
        }
        try {
          opts.onSearch?.();
          const hits = await search({
            apiKey: opts.apiKey,
            folderId: opts.folderId,
            query,
            maxResults: maxResults ?? 8,
            region,
          });
          return {
            query,
            totalResults: hits.length,
            results: hits.map((h) => ({
              position: h.position,
              title: h.title,
              url: h.url,
              domain: h.domain,
              headline: h.headline,
              snippet: h.snippet,
              passages: h.passages,
            })),
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { error: message };
        }
      },
    }),
  };
}
