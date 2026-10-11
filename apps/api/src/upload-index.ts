import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { UploadManifest } from "./upload-store.js";
import { readUploadManifest, uploadDirForDeck } from "./upload-store.js";

export type UploadIndexEntry = {
  id: string;
  storedName: string;
  originalName: string;
  mime: string;
  caption: string;
  tokens: string[];
};

export type UploadIndex = {
  deckId: string;
  files: UploadIndexEntry[];
};

export function tokenizeForSearch(...parts: string[]): string[] {
  const raw = parts.join(" ").toLowerCase();
  const tokens = raw
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  return [...new Set(tokens)];
}

function stemCaptionFromName(originalName: string, storedName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base || storedName.replace(/\.[^.]+$/, "");
}

type CaptionFn = (opts: {
  bytes: Buffer;
  mime: string;
  originalName: string;
}) => Promise<string>;

async function defaultVisionCaption(opts: {
  bytes: Buffer;
  mime: string;
  originalName: string;
  apiKey: string;
  apiBase: string;
  model: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  if (!opts.apiKey?.trim()) {
    return stemCaptionFromName(opts.originalName, opts.originalName);
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const apiBase = opts.apiBase.replace(/\/$/, "");
  const b64 = opts.bytes.toString("base64");
  const res = await fetchImpl(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Describe this photo in 1 short sentence for presentation image search. " +
                "Include main subject, setting, and language of any visible text. " +
                "Reply with plain text only, no quotes.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${opts.mime};base64,${b64}` },
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    throw new Error(`vision caption ${res.status}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("vision caption empty");
  return text.slice(0, 400);
}

export async function ensureUploadIndex(opts: {
  uploadRoot: string;
  deckId: string;
  apiKey: string;
  apiBase: string;
  model?: string;
  caption?: CaptionFn;
  fetchImpl?: typeof fetch;
}): Promise<UploadIndex | null> {
  const manifest = await readUploadManifest(opts.uploadRoot, opts.deckId);
  if (!manifest || manifest.files.length === 0) return null;

  const dir = uploadDirForDeck(opts.uploadRoot, opts.deckId);
  const indexPath = join(dir, "index.json");
  let existing: UploadIndex | null = null;
  if (existsSync(indexPath)) {
    try {
      existing = JSON.parse(await readFile(indexPath, "utf8")) as UploadIndex;
    } catch {
      existing = null;
    }
  }

  const byId = new Map((existing?.files ?? []).map((f) => [f.id, f]));
  const captionFn =
    opts.caption ??
    ((args) =>
      defaultVisionCaption({
        ...args,
        apiKey: opts.apiKey,
        apiBase: opts.apiBase,
        model: opts.model || "openai/gpt-4o-mini",
        fetchImpl: opts.fetchImpl,
      }));

  const files: UploadIndexEntry[] = [];
  for (const entry of manifest.files) {
    const prev = byId.get(entry.id);
    if (prev?.caption?.trim() && prev.storedName === entry.storedName) {
      files.push({
        ...prev,
        originalName: entry.originalName,
        mime: entry.mime,
        tokens: prev.tokens?.length
          ? prev.tokens
          : tokenizeForSearch(prev.caption, entry.originalName, entry.storedName),
      });
      continue;
    }

    const abs = join(dir, entry.storedName);
    let caption = stemCaptionFromName(entry.originalName, entry.storedName);
    try {
      const bytes = await readFile(abs);
      caption = await captionFn({
        bytes,
        mime: entry.mime,
        originalName: entry.originalName,
      });
    } catch (err) {
      console.warn(
        `[upload-index] caption fail ${entry.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    files.push({
      id: entry.id,
      storedName: entry.storedName,
      originalName: entry.originalName,
      mime: entry.mime,
      caption,
      tokens: tokenizeForSearch(caption, entry.originalName, entry.storedName),
    });
  }

  const index: UploadIndex = { deckId: opts.deckId, files };
  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
  return index;
}

export async function loadUploadIndex(uploadDir: string): Promise<UploadIndex> {
  const path = join(uploadDir, "index.json");
  if (existsSync(path)) {
    return JSON.parse(await readFile(path, "utf8")) as UploadIndex;
  }
  const manifestPath = join(uploadDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    return { deckId: "", files: [] };
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as UploadManifest;
  return {
    deckId: manifest.deckId,
    files: manifest.files.map((f) => {
      const caption = stemCaptionFromName(f.originalName, f.storedName);
      return {
        id: f.id,
        storedName: f.storedName,
        originalName: f.originalName,
        mime: f.mime,
        caption,
        tokens: tokenizeForSearch(caption, f.originalName, f.storedName),
      };
    }),
  };
}
