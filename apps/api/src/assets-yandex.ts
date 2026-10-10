import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { safePublicPath } from "./assets-stock.js";

export type YandexImageHit = {
  id: string;
  title: string;
  imageUrl: string;
  thumbUrl: string;
  pageUrl: string;
  width: number;
  height: number;
  domain: string;
};

/** CDN / aggregator hosts — prefer real site domains for download. */
const YANDEX_CDN_DOMAINS = [
  "avatars.mds.yandex.net",
  "yandex.ru",
  "yandex.net",
  "ya.ru",
  "images-wixmp-",
  "static.tildacdn.com",
  "img.freepik.com",
];

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

export function isYandexCdnDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  return YANDEX_CDN_DOMAINS.some((cdn) => d === cdn || d.endsWith(`.${cdn}`) || d.includes(cdn));
}

/** Build a human label when upstream title is empty (common for Yandex Images API). */
export function enrichYandexHit(hit: YandexImageHit): YandexImageHit {
  if (hit.title?.trim()) return hit;
  let fromPath = "";
  try {
    const u = new URL(hit.pageUrl);
    fromPath = decodeURIComponent(u.pathname)
      .split("/")
      .filter((p) => p && !/^\d+$/.test(p))
      .slice(-3)
      .join(" ")
      .replace(/[-_]+/g, " ")
      .trim();
  } catch {
    /* ignore bad pageUrl */
  }
  const host = hit.domain || (() => {
    try {
      return new URL(hit.pageUrl).hostname;
    } catch {
      return "";
    }
  })();
  const title = [fromPath, host].filter(Boolean).join(" — ").slice(0, 160);
  return { ...hit, title: title || host || "yandex-image" };
}

/** Prefer a non-CDN topical hit for immediate yandex-image-download. */
export function suggestYandexDownloadId(hits: YandexImageHit[]): string | undefined {
  if (!hits.length) return undefined;
  const ranked = [...hits].sort((a, b) => {
    const aCdn = isYandexCdnDomain(a.domain) ? 1 : 0;
    const bCdn = isYandexCdnDomain(b.domain) ? 1 : 0;
    if (aCdn !== bCdn) return aCdn - bCdn;
    const aSite = (() => {
      try {
        return new URL(a.pageUrl).hostname;
      } catch {
        return a.domain;
      }
    })();
    const bSite = (() => {
      try {
        return new URL(b.pageUrl).hostname;
      } catch {
        return b.domain;
      }
    })();
    const aSiteCdn = isYandexCdnDomain(aSite) ? 1 : 0;
    const bSiteCdn = isYandexCdnDomain(bSite) ? 1 : 0;
    return aSiteCdn - bSiteCdn;
  });
  return ranked[0]?.id;
}

export async function searchYandexImages(opts: {
  baseUrl: string;
  query: string;
  count?: number;
  orientation?: "horizontal" | "vertical" | "square";
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<YandexImageHit[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, "");
  const res = await fetchImpl(`${base}/search`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      query: opts.query,
      count: opts.count ?? 5,
      orientation: opts.orientation ?? "horizontal",
    }),
    signal: withTimeout(opts.timeoutMs ?? 15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`yandex-images search ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { hits?: YandexImageHit[] };
  const raw = Array.isArray(data.hits) ? data.hits : [];
  return raw.map(enrichYandexHit);
}

export async function downloadYandexImageToPublic(opts: {
  workDir: string;
  url: string;
  filename: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<{ path: string; file: string }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const file = safePublicPath(opts.workDir, opts.filename);
  await mkdir(join(opts.workDir, "public"), { recursive: true });
  const res = await fetchImpl(opts.url, { signal: withTimeout(opts.timeoutMs ?? 15_000) });
  if (!res.ok) throw new Error(`yandex-images download ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return { path: `/${basename(file)}`, file };
}
