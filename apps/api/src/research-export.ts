import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { zipStore } from "./zip-store.js";

export class ResearchArchiveEmptyError extends Error {
  constructor() {
    super("research archive empty");
    this.name = "ResearchArchiveEmptyError";
  }
}

export function factsDownloadBasename(topic: string): string {
  const base =
    topic
      .replace(/[^\p{L}\p{N}\-_ ]+/gu, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80) || "presentation";
  return `${base} факты.zip`;
}

/** Build a ZIP with research.md, assets.json (if present), and public/ files under images/. */
export async function buildResearchArchive(workDir: string): Promise<Buffer> {
  const files: Array<{ name: string; data: Buffer }> = [];

  const researchPath = join(workDir, "research.md");
  if (existsSync(researchPath)) {
    files.push({ name: "research.md", data: await readFile(researchPath) });
  }

  const assetsPath = join(workDir, "assets.json");
  if (existsSync(assetsPath)) {
    files.push({ name: "assets.json", data: await readFile(assetsPath) });
  }

  const publicDir = join(workDir, "public");
  if (existsSync(publicDir)) {
    const names = await readdir(publicDir);
    for (const name of names) {
      if (name.startsWith(".")) continue;
      const full = join(publicDir, name);
      const st = await stat(full);
      if (!st.isFile()) continue;
      files.push({ name: `images/${name}`, data: await readFile(full) });
    }
  }

  if (files.length === 0) throw new ResearchArchiveEmptyError();
  return zipStore(files);
}
