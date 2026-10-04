import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { guardMarkdown } from "./md-guard.js";

export async function writeSlides(workDir: string, markdown: string): Promise<string> {
  await mkdir(workDir, { recursive: true });
  const file = join(workDir, "slides.md");
  await writeFile(file, guardMarkdown(markdown), "utf8");
  await writeFile(
    join(workDir, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: {
        "@slidev/cli": "51.8.2",
        "@slidev/theme-default": "0.25.0",
      },
    }),
  );
  return file;
}

export function buildSlidev(workDir: string, timeoutMs = 180_000): Promise<void> {
  const root = fileURLToPath(new URL("../../..", import.meta.url));
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["--yes", "@slidev/cli", "build", "slides.md", "--out", "dist", "--base", "./"],
      {
        cwd: workDir,
        env: {
          ...process.env,
          CI: "1",
          npm_config_yes: "true",
          NODE_PATH: `${join(root, "node_modules")}:${process.env.NODE_PATH ?? ""}`,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("slidev build timeout"));
    }, timeoutMs);
    child.on("exit", (code) => {
      clearTimeout(t);
      if (code === 0) resolve();
      else reject(new Error(stderr || `slidev exit ${code}`));
    });
  });
}
