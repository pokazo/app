import { tool } from "ai";
import { z } from "zod";
import {
  downloadStockToPublic,
  searchUnsplash,
  type StockAttribution,
  type StockHit,
} from "./assets-stock.js";

export type StockToolAttribution = StockAttribution & { id?: string; path: string; query?: string };

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
    search?: SearchFn;
    download?: DownloadFn;
    onAttribution?: (entry: StockToolAttribution) => void;
  },
): Record<string, unknown> {
  const configured = Boolean(opts.accessKey);
  const search = opts.search ?? ((args) => searchUnsplash({ ...args, accessKey: opts.accessKey }));
  const download = opts.download ?? ((args) => downloadStockToPublic(args));
  const cache = new Map<string, StockHit>();

  return {
    "stock-search": tool({
      description:
        "Search Unsplash stock photos. Prefer landscape for image-right/left slides. Returns ids and urls; then call stock-download. If error, fall back to a non-image layout.",
      parameters: z.object({
        query: z.string().describe("English search query, e.g. modern glass office atrium"),
        orientation: z.enum(["landscape", "portrait", "squarish"]).optional(),
        count: z.number().int().min(1).max(5).optional(),
      }),
      execute: async ({ query, orientation, count }) => {
        if (!configured) {
          return { error: "UNSPLASH_ACCESS_KEY not configured — skip photos, use icon/two-cols/quote instead" };
        }
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
        }));
      },
    }),
    "stock-download": tool({
      description:
        "Download a stock photo into the deck public/ folder. Pass id from stock-search (preferred) or a direct url. filename must be a simple basename like slide-2.jpg. Returns path for Slidev frontmatter image: field (e.g. /slide-2.jpg).",
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
        };
        opts.onAttribution?.(entry);
        return { path: result.path, attribution: result.attribution };
      },
    }),
  };
}
