#!/usr/bin/env node
/**
 * Rebuild layout golden PNGs outside Documents/ (iCloud can hang Slidev fs.read).
 *
 * Usage:
 *   node apps/api/scripts/update-layout-shots.mjs
 *
 * Expects /tmp/pokazo-layout-shots/nm from a one-time:
 *   mkdir -p /tmp/pokazo-layout-shots/nm && cd /tmp/pokazo-layout-shots/nm \
 *     && npm init -y && npm i @slidev/cli@52.20.1 @slidev/theme-default@0.25.0 playwright-chromium@1.63.0
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
const deck = join(base, "deck");
const out = join(apiRoot, "src/__screenshots__/layouts");
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
  "fact-long",
];
const heroVariantNames = [
  "hero-ribbon",
  "hero-corner",
  "hero-inset",
  "hero-fullbleed",
  "hero-product",
];

if (!existsSync(join(nm, ".bin/slidev"))) {
  console.error("Missing /tmp/pokazo-layout-shots/nm — see script header for npm install.");
  process.exit(1);
}

mkdirSync(join(deck, "layouts"), { recursive: true });
mkdirSync(join(deck, "public"), { recursive: true });
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
  copyFileSync(join(apiRoot, "slidev-layouts", name), join(deck, "layouts", name));
}
writeFileSync(
  join(deck, "public/slide-1.png"),
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);
writeFileSync(
  join(deck, "vite.config.ts"),
  `import { defineConfig } from 'vite'\nexport default defineConfig({ build: { cssMinify: false } })\n`,
);

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

try {
  if (!existsSync(join(deck, "node_modules"))) {
    spawnSync("ln", ["-sf", nm, join(deck, "node_modules")], { stdio: "inherit" });
  }
} catch {
  /* exists */
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

const dist = join(deck, "dist");
const prefix = "/p/gallery/";
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
await mkdir(out, { recursive: true });
async function captureDeck(namesList, basePath) {
  for (let i = 0; i < namesList.length; i++) {
    const name = namesList[i];
    await page.goto(`http://127.0.0.1:${port}${basePath}${i + 1}?embedded`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForSelector("#slide-container", { timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 600));
    const buf = await page.locator("#slide-container").screenshot({ type: "png" });
    await writeFile(join(out, `${name}.png`), buf);
    console.log("wrote", name, buf.length);
  }
}
await captureDeck(names, "/p/gallery/");
await browser.close();
server.close();

const heroDeck = join(base, "hero-deck");
mkdirSync(join(heroDeck, "layouts"), { recursive: true });
mkdirSync(join(heroDeck, "public"), { recursive: true });
for (const name of [
  "layout-assert.js",
  "hero.vue",
]) {
  copyFileSync(join(apiRoot, "slidev-layouts", name), join(heroDeck, "layouts", name));
}
const heroImg = spawnSync(
  "pnpm",
  [
    "exec",
    "tsx",
    "-e",
    `import { writeFileSync } from "fs"; import { heroFixturePng, heroVariantsMarkdown } from "./src/layout-fixtures.ts"; writeFileSync(${JSON.stringify(join(heroDeck, "public/slide-1.png"))}, heroFixturePng()); writeFileSync(${JSON.stringify(join(heroDeck, "slides.md"))}, heroVariantsMarkdown());`,
  ],
  { cwd: apiRoot, encoding: "utf8" },
);
if (heroImg.status !== 0) {
  console.error(heroImg.stderr || heroImg.stdout);
  process.exit(heroImg.status ?? 1);
}
writeFileSync(
  join(heroDeck, "vite.config.ts"),
  `import { defineConfig } from 'vite'\nexport default defineConfig({ build: { cssMinify: false } })\n`,
);
try {
  if (!existsSync(join(heroDeck, "node_modules"))) {
    spawnSync("ln", ["-sf", nm, join(heroDeck, "node_modules")], { stdio: "inherit" });
  }
} catch {
  /* exists */
}
const heroBuild = spawnSync(
  join(nm, ".bin/slidev"),
  ["build", "slides.md", "--out", "dist", "--base", "/p/heroes/"],
  { cwd: heroDeck, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
if (heroBuild.status !== 0) {
  console.error(heroBuild.stderr || heroBuild.stdout);
  process.exit(heroBuild.status ?? 1);
}

const heroDist = join(heroDeck, "dist");
const heroPrefix = "/p/heroes/";
const heroServer = createServer(async (req, res) => {
  try {
    const u = new URL(req.url || "/", "http://127.0.0.1");
    if (!u.pathname.startsWith(heroPrefix)) {
      res.writeHead(404);
      res.end("nf");
      return;
    }
    let rel = decodeURIComponent(u.pathname.slice(heroPrefix.length)) || "index.html";
    if (rel.endsWith("/")) rel += "index.html";
    let file = normalize(join(heroDist, rel));
    if (!file.startsWith(normalize(heroDist))) {
      res.writeHead(403);
      res.end("no");
      return;
    }
    if (!existsSync(file) || /^\d+/.test(rel)) file = join(heroDist, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("missing");
  }
});
await new Promise((r) => heroServer.listen(0, "127.0.0.1", r));
const heroPort = heroServer.address().port;
const heroBrowser = await chromium.launch({ headless: true });
const heroPage = await heroBrowser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
for (let i = 0; i < heroVariantNames.length; i++) {
  const name = heroVariantNames[i];
  await heroPage.goto(`http://127.0.0.1:${heroPort}/p/heroes/${i + 1}?embedded`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await heroPage.waitForSelector("#slide-container", { timeout: 30_000 });
  await new Promise((r) => setTimeout(r, 600));
  const buf = await heroPage.locator("#slide-container").screenshot({ type: "png" });
  await writeFile(join(out, `${name}.png`), buf);
  console.log("wrote", name, buf.length);
}
await heroBrowser.close();
heroServer.close();
console.log("goldens →", out);
