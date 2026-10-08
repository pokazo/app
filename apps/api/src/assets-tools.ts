import { tool } from "ai";
import { z } from "zod";
import {
  downloadStockToPublic,
  searchUnsplash,
  type StockAttribution,
  type StockHit,
} from "./assets-stock.js";

export type StockToolAttribution = StockAttribution & {
  id?: string;
  path: string;
  query?: string;
  source?: "unsplash";
};

type SearchFn = (opts: {
  accessKey: string;
  query: string;
  orientation?: "landscape" | "portrait" | "squarish";
  count?: number;
}) => Promise<StockHit[]>;

type DownloadFn = (opts: {
  workDir: string;
  url: string;
  filename: string;
  attribution: StockAttribution;
}) => Promise<{ path: string; attribution: StockAttribution; file: string }>;

export function createStockTools(
  workDir: string,
  opts: {
    accessKey: string;
    apiBase?: string;
    imagesBase?: string;
    search?: SearchFn;
    download?: DownloadFn;
    onAttribution?: (entry: StockToolAttribution) => void;
  },
): Record<string, unknown> {
  const configured = Boolean(opts.accessKey);
  const search =
    opts.search ??
    ((args) => searchUnsplash({ ...args, accessKey: opts.accessKey, apiBase: opts.apiBase }));
  const download =
    opts.download ?? ((args) => downloadStockToPublic({ ...args, imagesBase: opts.imagesBase }));
  const cache = new Map<string, StockHit>();

  return {
    "stock-search": tool({
      description:
        "SECOND photo search after yandex-image-search. Search Unsplash stock photos (English query). Prefer landscape. Returns ids plus description/altDescription so you can judge subject relevance. Use when Yandex was empty, wrong subject, or errored. If Unsplash hits are empty OR clearly the wrong subject, do NOT download — call image-generate instead. Otherwise stock-download with the matching id. Empty/error: retry once with a simpler English query, then generate. Do not skip photos for the rest of the deck.",
      parameters: z.object({
        query: z.string().describe("English search query, e.g. modern glass office atrium"),
        orientation: z.enum(["landscape", "portrait", "squarish"]).optional(),
        count: z.number().int().min(1).max(5).optional(),
      }),
      execute: async ({ query, orientation, count }) => {
        if (!configured) {
          return { error: "UNSPLASH_ACCESS_KEY not configured — use image-generate or icon/two-cols/quote instead" };
        }
        try {
          const hits = await search({
            accessKey: opts.accessKey,
            query,
            orientation,
            count,
          });
          for (const h of hits) cache.set(h.id, h);
          return hits.map((h) => ({
            id: h.id,
            thumb: h.thumb,
            width: h.width,
            height: h.height,
            photographer: h.photographer,
            attributionUrl: h.attributionUrl,
            description: h.description,
            altDescription: h.altDescription,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { error: message, hint: "retry simpler query once, then image-generate" };
        }
      },
    }),
    "stock-download": tool({
      description:
        "Download a Unsplash photo into the deck public/ folder. Pass id from stock-search (preferred). filename must be a simple basename like slide-2.jpg. Returns path for Slidev frontmatter image: (e.g. /slide-2.jpg). Call this after a successful stock-search before inserting the slide.",
      parameters: z.object({
        id: z.string().optional(),
        url: z.string().url().optional(),
        filename: z.string().describe("basename only, e.g. slide-3.jpg"),
      }),
      execute: async ({ id, url, filename }) => {
        if (!configured) {
          return { error: "UNSPLASH_ACCESS_KEY not configured — skip photos" };
        }
        let hit: StockHit | undefined = id ? cache.get(id) : undefined;
        const downloadUrl = hit?.url ?? url;
        if (!downloadUrl) {
          return { error: "provide id from stock-search or url" };
        }
        const attribution: StockAttribution = hit
          ? { photographer: hit.photographer, attributionUrl: hit.attributionUrl }
          : { photographer: "Unknown", attributionUrl: "https://unsplash.com" };
        const result = await download({
          workDir,
          url: downloadUrl,
          filename,
          attribution,
        });
        const entry: StockToolAttribution = {
          ...result.attribution,
          id,
          path: result.path,
          source: "unsplash",
        };
        opts.onAttribution?.(entry);
        return { path: result.path, attribution: result.attribution, source: "unsplash" as const };
      },
    }),
  };
}
