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

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
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
  return Array.isArray(data.hits) ? data.hits : [];
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
