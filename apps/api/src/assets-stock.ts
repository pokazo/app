import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, normalize, sep } from "node:path";

export type StockHit = {
  id: string;
  url: string;
  thumb: string;
  width: number;
  height: number;
  photographer: string;
  attributionUrl: string;
  /** Unsplash description — used by compose to judge subject relevance. */
  description: string;
  /** Unsplash alt_description — secondary relevance signal. */
  altDescription: string;
};

export type StockAttribution = {
  photographer: string;
  attributionUrl: string;
};

export function safePublicPath(workDir: string, filename: string): string {
  if (filename.startsWith("/") || filename.includes("..") || filename.includes(sep)) {
    throw new Error(`unsafe stock filename: ${filename}`);
  }
  const base = basename(filename);
  if (!base || base !== filename || !/^[a-zA-Z0-9._-]+$/.test(base)) {
    throw new Error(`unsafe stock filename: ${filename}`);
  }
  const publicDir = join(workDir, "public");
  const target = normalize(join(publicDir, base));
  if (!target.startsWith(normalize(publicDir) + sep) && target !== normalize(publicDir)) {
    throw new Error(`unsafe stock path: ${filename}`);
  }
  return target;
}

export function rewriteUnsplashImageUrl(url: string, imagesBase?: string): string {
  const base = (imagesBase ?? "").replace(/\/$/, "");
  if (!base) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "images.unsplash.com") return url;
    return `${base}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

export async function searchUnsplash(opts: {
  accessKey: string;
  query: string;
  orientation?: "landscape" | "portrait" | "squarish";
  count?: number;
  apiBase?: string;
  fetchImpl?: typeof fetch;
}): Promise<StockHit[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const count = Math.min(5, Math.max(1, opts.count ?? 3));
  const params = new URLSearchParams({
    query: opts.query,
    per_page: String(count),
    orientation: opts.orientation ?? "landscape",
  });
  const apiBase = (opts.apiBase || "https://api.unsplash.com").replace(/\/$/, "");
  const res = await fetchImpl(`${apiBase}/search/photos?${params}`, {
    headers: {
      Authorization: `Client-ID ${opts.accessKey}`,
      "Accept-Version": "v1",
    },
  });
  if (!res.ok) {
    throw new Error(`unsplash search ${res.status}`);
  }
  const data = (await res.json()) as {
    results?: Array<{
      id: string;
      description?: string | null;
      alt_description?: string | null;
      urls: { raw?: string; regular?: string; small?: string };
      width: number;
      height: number;
      user?: { name?: string; links?: { html?: string } };
    }>;
  };
  return (data.results ?? []).map((r) => {
    const raw = r.urls.raw ?? r.urls.regular ?? "";
    const url = raw.includes("?") ? `${raw}&w=1600` : `${raw}?w=1600`;
    return {
      id: r.id,
      url,
      thumb: r.urls.small ?? r.urls.regular ?? url,
      width: r.width,
      height: r.height,
      photographer: r.user?.name ?? "Unknown",
      attributionUrl: r.user?.links?.html ?? "https://unsplash.com",
      description: (r.description ?? "").trim(),
      altDescription: (r.alt_description ?? "").trim(),
    };
  });
}

export async function downloadStockToPublic(opts: {
  workDir: string;
  url: string;
  filename: string;
  attribution: StockAttribution;
  imagesBase?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ path: string; attribution: StockAttribution; file: string }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const file = safePublicPath(opts.workDir, opts.filename);
  await mkdir(join(opts.workDir, "public"), { recursive: true });
  const res = await fetchImpl(rewriteUnsplashImageUrl(opts.url, opts.imagesBase));
  if (!res.ok) {
    throw new Error(`unsplash download ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(file, buf);
  return {
    path: `/${basename(file)}`,
    attribution: opts.attribution,
    file,
  };
}
