import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { safePublicPath } from "./assets-stock.js";
import { writeImageThumb } from "./image-variants.js";

export type ImageGenAttribution = {
  source: "openai";
  model: string;
  prompt: string;
};

export const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1-mini";
export const DEFAULT_OPENAI_IMAGE_QUALITY = "low" as const;
export const DEFAULT_OPENAI_IMAGE_SIZE = "1536x1024" as const;

type ImagesApiResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
};

export async function generateOpenAiImageToPublic(opts: {
  workDir: string;
  prompt: string;
  filename: string;
  apiKey: string;
  model?: string;
  quality?: "low" | "medium" | "high";
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  apiBase?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ path: string; attribution: ImageGenAttribution; file: string }> {
  if (!opts.apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  const model = opts.model || DEFAULT_OPENAI_IMAGE_MODEL;
  const quality = opts.quality ?? DEFAULT_OPENAI_IMAGE_QUALITY;
  const size = opts.size ?? DEFAULT_OPENAI_IMAGE_SIZE;
  const apiBase = (opts.apiBase || "https://api.openai.com/v1").replace(/\/$/, "");
  const fetchImpl = opts.fetchImpl ?? fetch;

  const target = safePublicPath(opts.workDir, opts.filename);
  await mkdir(dirname(target), { recursive: true });

  const res = await fetchImpl(`${apiBase}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: opts.prompt,
      n: 1,
      size,
      quality,
    }),
  });

  const data = (await res.json()) as ImagesApiResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || `openai images ${res.status}`);
  }
  const item = data.data?.[0];
  if (!item) {
    throw new Error("openai images: empty data");
  }

  let bytes: Uint8Array;
  if (item.b64_json) {
    bytes = Buffer.from(item.b64_json, "base64");
  } else if (item.url) {
    const imgRes = await fetchImpl(item.url);
    if (!imgRes.ok) {
      throw new Error(`openai image download ${imgRes.status}`);
    }
    bytes = new Uint8Array(await imgRes.arrayBuffer());
  } else {
    throw new Error("openai images: no b64_json or url");
  }

  await writeFile(target, bytes);
  await writeImageThumb(target);
  const webPath = `/${opts.filename.replace(/^\/+/, "")}`;
  return {
    path: webPath,
    file: target,
    attribution: { source: "openai", model, prompt: opts.prompt },
  };
}
