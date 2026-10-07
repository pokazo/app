import { existsSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SPEECH_JSON, parseSpeechJson, type SpeechDocT } from "./speech.js";

const SPEECH_PDF = "speech.pdf";
const inflight = new Map<string, Promise<string>>();

export function speechPdfPath(workDir: string): string {
  return join(workDir, SPEECH_PDF);
}

export function isSpeechPdfFresh(workDir: string): boolean {
  const pdf = speechPdfPath(workDir);
  const json = join(workDir, SPEECH_JSON);
  if (!existsSync(pdf) || !existsSync(json)) return false;
  return statSync(pdf).mtimeMs >= statSync(json).mtimeMs;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function speechDownloadBasename(topic: string): string {
  const base =
    topic
      .replace(/[^\p{L}\p{N}\-_ ]+/gu, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80) || "presentation";
  return `${base} — спич.pdf`;
}

export function speechPdfHtml(topic: string, doc: SpeechDocT): string {
  const slides = [...doc.slides].sort((a, b) => a.index - b.index);
  const body = slides
    .map((s) => {
      const theses = s.theses
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => `<li>${escapeHtml(t)}</li>`)
        .join("");
      const paras = s.speech
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
      return `<section class="slide">
  <h2>Слайд ${s.index} ${escapeHtml(s.heading)}</h2>
  <h3>Тезисы</h3>
  <ul>${theses}</ul>
  <h3>Спич</h3>
  ${paras}
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #1a1a1a; line-height: 1.45; font-size: 12pt; }
  h1 { font-size: 20pt; margin: 0 0 1.2em; }
  h2 { font-size: 14pt; margin: 1.4em 0 0.5em; page-break-after: avoid; }
  h3 { font-size: 11pt; margin: 0.8em 0 0.3em; color: #444; }
  ul { margin: 0.2em 0 0.6em 1.2em; padding: 0; }
  li { margin: 0.15em 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5pt; }
  p { margin: 0.35em 0; }
  .slide { break-inside: avoid; }
</style>
</head>
<body>
  <h1>${escapeHtml(topic)}</h1>
  ${body}
</body>
</html>`;
}

async function renderSpeechPdf(workDir: string, topic: string): Promise<string> {
  const raw = await readFile(join(workDir, SPEECH_JSON), "utf8");
  const doc = parseSpeechJson(raw);
  const html = speechPdfHtml(topic, doc);
  const out = speechPdfPath(workDir);
  const { chromium } = await import("playwright-chromium");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    await writeFile(out, pdf);
    return out;
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function ensureSpeechPdf(workDir: string, topic: string): Promise<string> {
  if (!existsSync(join(workDir, SPEECH_JSON))) {
    throw new Error("speech missing");
  }
  if (isSpeechPdfFresh(workDir)) return speechPdfPath(workDir);
  const key = workDir;
  const pending = inflight.get(key);
  if (pending) return pending;
  const job = renderSpeechPdf(workDir, topic).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, job);
  return job;
}
