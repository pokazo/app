import { copyFileSync, existsSync, mkdirSync, symlinkSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
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
  for (const name of ["timeline.vue", "stats.vue", "skills.vue", "hero.vue", "image-right.vue", "image-left.vue"]) {
    copyFileSync(join(src, name), join(dest, name));
  }
}

export function slidevSpawnSpec(workDir: string, base: string): SlidevSpawnSpec {
  return {
    bin: slidevBin(),
    args: ["build", "slides.md", "--out", "dist", "--base", base],
    cwd: workDir,
  };
}

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

export function buildSlidev(workDir: string, base = "./", timeoutMs = 180_000): Promise<void> {
  ensureDeckNodeModules(workDir);
  installDeckLayouts(workDir);
  const spec = slidevSpawnSpec(workDir, base);
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
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("slidev build timeout"));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
    child.on("exit", (code) => {
      clearTimeout(t);
      if (code !== 0) {
        reject(new Error(stderr || `slidev exit ${code}`));
        return;
      }
      try {
        assertSlidevDist(workDir);
        resolve();
      } catch (err) {
        reject(new Error([String(err), stderr].filter(Boolean).join("\n")));
      }
    });
  });
}
