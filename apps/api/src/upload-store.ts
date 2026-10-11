import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, normalize, sep } from "node:path";
import { existsSync } from "node:fs";

export const UPLOAD_MAX_FILES = 20;
export const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

export const UPLOAD_MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export type UploadManifestEntry = {
  id: string;
  originalName: string;
  storedName: string;
  mime: string;
  bytes: number;
  uploadedAt: string;
};

export type UploadManifest = {
  deckId: string;
  files: UploadManifestEntry[];
};

export function uploadDirForDeck(uploadRoot: string, deckId: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deckId)) {
    throw new Error(`unsafe deck id: ${deckId}`);
  }
  const root = normalize(uploadRoot);
  const target = normalize(join(root, deckId));
  if (!target.startsWith(root + sep) && target !== root) {
    throw new Error(`unsafe upload path for deck ${deckId}`);
  }
  return target;
}

export function hasUploadImages(uploadRoot: string, deckId: string): boolean {
  const dir = uploadDirForDeck(uploadRoot, deckId);
  const manifestPath = join(dir, "manifest.json");
  return existsSync(manifestPath);
}

function sanitizeOriginalName(name: string): string {
  const base = basename(name || "image").replace(/[^\w.\-()+ ]+/g, "_");
  return base.slice(0, 120) || "image";
}

export function resolveUploadMime(file: { type?: string; name?: string }): string | null {
  const t = (file.type || "").toLowerCase();
  if (t && UPLOAD_MIME_EXT[t]) return t;
  const lower = (file.name || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

export async function persistDeckUploads(opts: {
  uploadRoot: string;
  deckId: string;
  files: Array<{ name: string; type: string; arrayBuffer: () => Promise<ArrayBuffer> }>;
}): Promise<UploadManifest> {
  const files = opts.files.slice(0, UPLOAD_MAX_FILES);
  if (files.length === 0) {
    return { deckId: opts.deckId, files: [] };
  }

  const dir = uploadDirForDeck(opts.uploadRoot, opts.deckId);
  await mkdir(dir, { recursive: true });

  const entries: UploadManifestEntry[] = [];
  let index = 0;
  for (const file of files) {
    const mime = resolveUploadMime(file);
    if (!mime) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > UPLOAD_MAX_BYTES) continue;
    index += 1;
    const id = `up-${String(index).padStart(3, "0")}`;
    const ext = UPLOAD_MIME_EXT[mime];
    const storedName = `${id}${ext}`;
    const target = join(dir, storedName);
    await writeFile(target, buf);
    entries.push({
      id,
      originalName: sanitizeOriginalName(file.name),
      storedName,
      mime,
      bytes: buf.byteLength,
      uploadedAt: new Date().toISOString(),
    });
  }

  const manifest: UploadManifest = { deckId: opts.deckId, files: entries };
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

export async function readUploadManifest(
  uploadRoot: string,
  deckId: string,
): Promise<UploadManifest | null> {
  const dir = uploadDirForDeck(uploadRoot, deckId);
  const path = join(dir, "manifest.json");
  if (!existsSync(path)) return null;
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(path, "utf8")) as UploadManifest;
}
