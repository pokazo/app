#!/usr/bin/env node
/**
 * Build agenda multi-palette deck and write PNGs for review.
 * Uses /tmp/pokazo-layout-shots/nm (same as update-layout-shots.mjs).
 */
import { createServer } from "node:http";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import playwrightChromium from "/tmp/pokazo-layout-shots/nm/node_modules/playwright-chromium/index.js";
const { chromium } = playwrightChromium;

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(__dirname, "..");
const base = "/tmp/pokazo-layout-shots";
const nm = join(base, "nm", "node_modules");
const deck = join(base, "agenda-deck");
const out = join(apiRoot, "src/__screenshots__/layouts");
const paletteOut = join(apiRoot, "src/__screenshots__/agenda-palettes");

const names = [
  "hero",
  "image-right",
  "image-left",
  "two-cols",
  "quote",
  "fact",
  "icon",
  "cards",
  "timeline",
  "stats",
  "skills",
  "statement",
  "features",
  "process",
  "spotlight",
  "pie",
  "agenda",
];

const palettes = [
  "cream",
  "ink",
  "ocean",
  "forest",
  "amber",
  "candy",
  "neon",
  "volt",
];

if (!existsSync(join(nm, ".bin/slidev"))) {
  console.error("Missing /tmp/pokazo-layout-shots/nm — see update-layout-shots.mjs header.");
  process.exit(1);
}

function copyLayouts(dest) {
  mkdirSync(join(dest, "layouts"), { recursive: true });
  mkdirSync(join(dest, "public"), { recursive: true });
  for (const name of [
    "layout-assert.js",
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
    "palette-class.js",
  ]) {
    copyFileSync(join(apiRoot, "slidev-layouts", name), join(dest, "layouts", name));
  }
  writeFileSync(
    join(dest, "public/slide-1.png"),
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  writeFileSync(
    join(dest, "vite.config.ts"),
    `import { defineConfig } from 'vite'\nexport default defineConfig({ build: { cssMinify: false } })\n`,
  );
  try {
    if (!existsSync(join(dest, "node_modules"))) {
      spawnSync("ln", ["-sf", nm, join(dest, "node_modules")], { stdio: "inherit" });
    }
  } catch {
    /* exists */
  }
}

async function serveAndCapture(dist, prefix, pathBase, shotNames, destDir) {
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
  };
  const server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url || "/", "http://127.0.0.1");
      if (!u.pathname.startsWith(prefix)) {
        res.writeHead(404);
        res.end("nf");
        return;
      }
      let rel = decodeURIComponent(u.pathname.slice(prefix.length)) || "index.html";
      if (rel.endsWith("/")) rel += "index.html";
      let file = normalize(join(dist, rel));
      if (!file.startsWith(normalize(dist))) {
        res.writeHead(403);
        res.end("no");
        return;
      }
      if (!existsSync(file) || /^\d+/.test(rel)) file = join(dist, "index.html");
      const body = await readFile(file);
      res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("missing");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await mkdir(destDir, { recursive: true });
  for (let i = 0; i < shotNames.length; i++) {
    const name = shotNames[i];
    await page.goto(`http://127.0.0.1:${port}${pathBase}${i + 1}?embedded`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForSelector("#slide-container", { timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 600));
    const buf = await page.locator("#slide-container").screenshot({ type: "png" });
    await writeFile(join(destDir, `${name}.png`), buf);
    console.log("wrote", name, buf.length);
  }
  await browser.close();
  server.close();
}

// 1) Full gallery golden including agenda
copyLayouts(deck);
const fixture = spawnSync(
  "pnpm",
  [
    "exec",
    "tsx",
    "-e",
    `import { writeFileSync } from "fs"; import { happyPathLayoutsMarkdown } from "./src/layout-fixtures.ts"; writeFileSync(${JSON.stringify(join(deck, "slides.md"))}, happyPathLayoutsMarkdown());`,
  ],
  { cwd: apiRoot, encoding: "utf8" },
);
if (fixture.status !== 0) {
  console.error(fixture.stderr || fixture.stdout);
  process.exit(fixture.status ?? 1);
}
const build = spawnSync(
  join(nm, ".bin/slidev"),
  ["build", "slides.md", "--out", "dist", "--base", "/p/gallery/"],
  { cwd: deck, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
if (build.status !== 0) {
  console.error(build.stderr || build.stdout);
  process.exit(build.status ?? 1);
}
await serveAndCapture(join(deck, "dist"), "/p/gallery/", "/p/gallery/", names, out);

// 2) Multi-palette agenda shots
const paletteDeck = join(base, "agenda-palettes");
copyLayouts(paletteDeck);
const paletteFixture = spawnSync(
  "pnpm",
  [
    "exec",
    "tsx",
    "-e",
    `import { writeFileSync } from "fs"; import { agendaPalettesMarkdown } from "./src/layout-fixtures.ts"; writeFileSync(${JSON.stringify(join(paletteDeck, "slides.md"))}, agendaPalettesMarkdown());`,
  ],
  { cwd: apiRoot, encoding: "utf8" },
);
if (paletteFixture.status !== 0) {
  console.error(paletteFixture.stderr || paletteFixture.stdout);
  process.exit(paletteFixture.status ?? 1);
}
const paletteBuild = spawnSync(
  join(nm, ".bin/slidev"),
  ["build", "slides.md", "--out", "dist", "--base", "/p/agenda/"],
  { cwd: paletteDeck, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
if (paletteBuild.status !== 0) {
  console.error(paletteBuild.stderr || paletteBuild.stdout);
  process.exit(paletteBuild.status ?? 1);
}
await serveAndCapture(
  join(paletteDeck, "dist"),
  "/p/agenda/",
  "/p/agenda/",
  palettes.map((p) => `agenda-${p}`),
  paletteOut,
);

console.log("gallery →", out);
console.log("palettes →", paletteOut);
