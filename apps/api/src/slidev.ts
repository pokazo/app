import { copyFileSync, existsSync, mkdirSync, readFileSync, symlinkSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertLayoutsInMarkdown } from "./layout-md-assert.js";
import { guardMarkdown } from "./md-guard.js";

export type SlidevSpawnSpec = {
  bin: string;
  args: string[];
  cwd: string;
};

function apiDir(): string {
  const root = fileURLToPath(new URL("../../..", import.meta.url));
  return join(root, "apps/api");
}

export function slidevBin(): string {
  return join(apiDir(), "node_modules/.bin/slidev");
}

export function installDeckLayouts(workDir: string): void {
  const dest = join(workDir, "layouts");
  mkdirSync(dest, { recursive: true });
  const src = join(apiDir(), "slidev-layouts");
  for (const name of [
    "layout-assert.js",
    "palette-class.js",
    "timeline.vue",
    "stats.vue",
    "skills.vue",
    "hero.vue",
    "image-right.vue",
    "image-left.vue",
    "two-cols.vue",
    "quote.vue",
    "fact.vue",
    "icon.vue",
    "cards.vue",
    "statement.vue",
    "features.vue",
    "process.vue",
    "spotlight.vue",
    "pie.vue",
    "agenda.vue",
  ]) {
    copyFileSync(join(src, name), join(dest, name));
  }
}

/** Public URL prefix for a hosted deck SPA (Slidev --base / Vite BASE_URL). */
export function deckServeBase(deckId: string): string {
  return `/p/${deckId}/`;
}

export function slidevSpawnSpec(workDir: string, base: string): SlidevSpawnSpec {
  return {
    bin: slidevBin(),
    args: ["build", "slides.md", "--out", "dist", "--base", base],
    cwd: workDir,
  };
}

export type SlidevExportFormat = "pdf" | "pptx";

/** Stdio MCP server for the deck entry (no live goto tool). */
export function slidevMcpSpawnSpec(workDir: string): SlidevSpawnSpec {
  return {
    bin: slidevBin(),
    args: ["mcp", "slides.md"],
    cwd: workDir,
  };
}

export function scaffoldMarkdown(title: string, theme: string): string {
  return guardMarkdown(
    `---
theme: ${theme}
title: ${JSON.stringify(title)}
---

# ${title}

`,
    theme,
  );
}

export function ensureDeckNodeModules(workDir: string): void {
  const dest = join(workDir, "node_modules");
  if (existsSync(dest)) return;
  symlinkSync(join(apiDir(), "node_modules"), dest);
}

export function assertSlidevDist(workDir: string): void {
  const index = join(workDir, "dist", "index.html");
  if (!existsSync(index)) {
    throw new Error(`slidev produced no dist at ${index}`);
  }
}

export async function writeSlides(workDir: string, markdown: string, theme = "default"): Promise<string> {
  await mkdir(workDir, { recursive: true });
  const file = join(workDir, "slides.md");
  await writeFile(file, guardMarkdown(markdown, theme), "utf8");
  return file;
}

/**
 * Per-deck Vite config: skip minify/sourcemaps + keep cacheDir so repeated
 * `slidev build` (structure move/delete) is faster. Artifact is still a static SPA.
 *
 * Optional shared cache: set `SLIDEV_VITE_CACHE` to an absolute dir (e.g.
 * `/app/data/cache/vite`). Prod bench showed ~0–3% vs per-deck `.vite-cache` —
 * keep for experiments; default stays per-deck.
 */
export function deckViteConfigSource(cacheDir = ".vite-cache"): string {
  return `import { defineConfig } from "vite";

export default defineConfig({
  cacheDir: ${JSON.stringify(cacheDir)},
  build: {
    minify: false,
    cssMinify: false,
    reportCompressedSize: false,
    sourcemap: false,
  },
});
`;
}

/** @deprecated use deckViteConfigSource(); kept for tests that compare full file */
export const DECK_VITE_CONFIG = deckViteConfigSource();

export function resolveSlidevViteCacheDir(): string {
  const shared = process.env.SLIDEV_VITE_CACHE?.trim();
  return shared && shared.startsWith("/") ? shared : ".vite-cache";
}

export async function ensureDeckViteConfig(workDir: string): Promise<void> {
  await mkdir(workDir, { recursive: true });
  await writeFile(join(workDir, "vite.config.ts"), deckViteConfigSource(resolveSlidevViteCacheDir()), "utf8");
}

function runSlidev(spec: SlidevSpawnSpec, timeoutMs: number, label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(spec.bin, spec.args, {
      cwd: spec.cwd,
      env: {
        ...process.env,
        CI: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    let stdout = "";
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${label} timeout`));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
    child.on("exit", (code) => {
      clearTimeout(t);
      if (code !== 0) {
        reject(new Error(stderr || stdout || `${label} exit ${code}`));
        return;
      }
      resolve(stderr || stdout);
    });
  });
}

export async function buildSlidev(workDir: string, base = "./", timeoutMs = 180_000): Promise<void> {
  ensureDeckNodeModules(workDir);
  installDeckLayouts(workDir);
  await ensureDeckViteConfig(workDir);
  const slidesPath = join(workDir, "slides.md");
  if (existsSync(slidesPath)) {
    assertLayoutsInMarkdown(readFileSync(slidesPath, "utf8"));
  }
  const spec = slidevSpawnSpec(workDir, base);
  const t0 = Date.now();
  const log = await runSlidev(spec, timeoutMs, "slidev build");
  console.info(`[timing] slidev-build ${workDir.split("/").pop()} ms=${Date.now() - t0}`);
  try {
    assertSlidevDist(workDir);
  } catch (err) {
    throw new Error([String(err), log].filter(Boolean).join("\n"));
  }
}

