import { tool } from "ai";
import { z } from "zod";
import {
  downloadYandexImageToPublic,
  searchYandexImages,
  suggestYandexDownloadId,
  type YandexImageHit,
} from "./assets-yandex.js";
import { timedTool } from "./timing.js";

export type YandexToolAttribution = {
  source: "yandex";
  path: string;
  id?: string;
  query?: string;
  title?: string;
  pageUrl?: string;
  imageUrl?: string;
  photographer: string;
  attributionUrl: string;
};

type SearchFn = (opts: {
  baseUrl: string;
  query: string;
  count?: number;
  orientation?: "horizontal" | "vertical" | "square";
}) => Promise<YandexImageHit[]>;

type DownloadFn = (opts: {
  workDir: string;
  url: string;
  filename: string;
}) => Promise<{ path: string; file: string }>;

export function createYandexImageTools(
  workDir: string,
  opts: {
    baseUrl: string;
    search?: SearchFn;
    download?: DownloadFn;
    onAttribution?: (entry: YandexToolAttribution) => void;
  },
): Record<string, unknown> {
  const configured = Boolean(opts.baseUrl?.trim());
  const search =
    opts.search ??
    ((args) => searchYandexImages({ ...args, baseUrl: opts.baseUrl, timeoutMs: 4_000 }));
  const download = opts.download ?? ((args) => downloadYandexImageToPublic(args));
  const cache = new Map<string, YandexImageHit>();
  let searchDead = false;
  let searchDeadReason = "";
  const yandexDown = (message: string) => ({
    error: message,
    hint: "Yandex Images unreachable — use stock-search, then image-generate",
  });

  return {
    "yandex-image-search": tool({
      description:
        "FIRST photo search for RU-relevant subjects via Yandex Images. Prefer natural Russian query naming the exact subject. Returns hits + suggestedId. Title may be synthesized from pageUrl when upstream title is empty — that is OK. Judge by title/domain/pageUrl; if a hit looks on-topic (or suggestedId is set), IMMEDIATELY call yandex-image-download with that id. Only if ALL hits are empty/wrong/CDN-only OR error → stock-search. Do not skip photos for the rest of the deck.",
      parameters: z.object({
        query: z.string().describe("Natural Russian (or subject-language) query, e.g. УАЗ Патриот внедорожник"),
        orientation: z.enum(["horizontal", "vertical", "square"]).optional(),
        count: z.number().int().min(1).max(10).optional(),
      }),
      execute: async ({ query, orientation, count }) =>
        timedTool("yandex-image-search", async () => {
          if (!configured) {
            return {
              error: "YANDEX_IMAGES_URL not configured — use stock-search or image-generate instead",
            };
          }
          if (searchDead) return yandexDown(searchDeadReason);
          try {
            const hits = await search({
              baseUrl: opts.baseUrl,
              query,
              orientation,
              count,
            });
            for (const h of hits) cache.set(h.id, h);
            const suggestedId = suggestYandexDownloadId(hits);
            return {
              hits: hits.map((h) => ({
                id: h.id,
                title: h.title,
                domain: h.domain,
                pageUrl: h.pageUrl,
                thumb: h.thumbUrl,
                width: h.width,
                height: h.height,
              })),
              suggestedId,
              hint: suggestedId
                ? `Prefer yandex-image-download id=${suggestedId} now (empty title is fine — use domain/pageUrl).`
                : "No suggestedId — if hits look wrong, stock-search next.",
            };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            searchDead = true;
            searchDeadReason = message;
            return yandexDown(message);
          }
        }, { query: String(query).slice(0, 80) }),
    }),
    "yandex-image-download": tool({
      description:
        "Download a Yandex Images hit into deck public/. Pass id from yandex-image-search. filename basename like slide-2.jpg. Returns path for Slidev image:. If download fails, try another id once, else Unsplash.",
      parameters: z.object({
        id: z.string().optional(),
        url: z.string().url().optional(),
        filename: z.string().describe("basename only, e.g. slide-3.jpg"),
        query: z.string().optional(),
      }),
      execute: async ({ id, url, filename, query }) =>
        timedTool("yandex-image-download", async () => {
          if (!configured) {
            return { error: "YANDEX_IMAGES_URL not configured — skip yandex download" };
          }
          if (searchDead) return yandexDown(searchDeadReason);
          const hit: YandexImageHit | undefined = id ? cache.get(id) : undefined;
          const downloadUrl = hit?.imageUrl ?? url;
          if (!downloadUrl) {
            return { error: "provide id from yandex-image-search or url" };
          }
          try {
            const result = await download({
              workDir,
              url: downloadUrl,
              filename,
            });
            const entry: YandexToolAttribution = {
              source: "yandex",
              path: result.path,
              id,
              query,
              title: hit?.title,
              pageUrl: hit?.pageUrl,
              imageUrl: hit?.imageUrl ?? downloadUrl,
              photographer: hit?.domain || "Yandex Images",
              attributionUrl: hit?.pageUrl || hit?.imageUrl || downloadUrl,
            };
            opts.onAttribution?.(entry);
            return {
              path: result.path,
              source: "yandex" as const,
              attribution: {
                photographer: entry.photographer,
                attributionUrl: entry.attributionUrl,
              },
            };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { error: message, hint: "try another id once, else stock-search" };
          }
        }, { filename }),
    }),
  };
}
