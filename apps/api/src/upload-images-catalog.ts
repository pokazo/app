import { join } from "node:path";
import { loadUploadIndex, tokenizeForSearch, type UploadIndex, type UploadIndexEntry } from "./upload-index.js";

export type UploadSearchHit = {
  id: string;
  filename: string;
  originalName: string;
  caption: string;
  score: number;
};

export async function uploadImageList(uploadDir: string): Promise<
  Array<{ id: string; filename: string; originalName: string; caption: string }>
> {
  const index = await loadUploadIndex(uploadDir);
  return index.files.map((f) => ({
    id: f.id,
    filename: f.storedName,
    originalName: f.originalName,
    caption: f.caption,
  }));
}

function scoreEntry(entry: UploadIndexEntry, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const hay = new Set(entry.tokens.length ? entry.tokens : tokenizeForSearch(entry.caption, entry.originalName));
  let hits = 0;
  for (const t of queryTokens) {
    if (hay.has(t)) {
      hits += 1;
      continue;
    }
    for (const h of hay) {
      if (h.includes(t) || t.includes(h)) {
        hits += 0.5;
        break;
      }
    }
  }
  return hits / queryTokens.length;
}

export async function uploadImageSearch(
  uploadDir: string,
  query: string,
  count = 5,
): Promise<{ hits: UploadSearchHit[]; suggestedId: string | null }> {
  const index = await loadUploadIndex(uploadDir);
  const queryTokens = tokenizeForSearch(query);
  const ranked = index.files
    .map((f) => ({
      id: f.id,
      filename: f.storedName,
      originalName: f.originalName,
      caption: f.caption,
      score: scoreEntry(f, queryTokens),
    }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(10, Math.max(1, count)));

  // If nothing matched tokens, still return top files so agent can judge captions.
  const hits =
    ranked.length > 0
      ? ranked
      : index.files.slice(0, Math.min(10, Math.max(1, count))).map((f) => ({
          id: f.id,
          filename: f.storedName,
          originalName: f.originalName,
          caption: f.caption,
          score: 0,
        }));

  // Always nudge a pick when uploads exist: filename tokens often beat vague vision captions.
  const suggestedId =
    hits.find((h) => h.score >= 0.2)?.id ??
    hits[0]?.id ??
    null;

  return { hits, suggestedId };
}

export async function resolveUploadFilePath(
  uploadDir: string,
  id: string,
): Promise<{ absPath: string; entry: UploadIndexEntry } | null> {
  const index = await loadUploadIndex(uploadDir);
  const entry = index.files.find((f) => f.id === id);
  if (!entry) return null;
  return { absPath: join(uploadDir, entry.storedName), entry };
}

export type { UploadIndex };
