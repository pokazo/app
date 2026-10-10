/**
 * One-off: generate a deck with Layout MCP, skipping outline-plan + render gate.
 * Env: load from process (e.g. sourced from prod container).
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { generateDeck } from "../src/generate.ts";

const id = `layout-mcp-${Date.now().toString(36)}`;
const workDir = join(process.cwd(), "../../data/decks", id);
await mkdir(workDir, { recursive: true });

process.env.SKIP_OUTLINE_PLAN = "1";
process.env.SKIP_LAYOUT_RENDER_GATE = "1";

console.info(`[stream] id=${id} workDir=${workDir}`);
console.info(`[stream] SKIP_OUTLINE_PLAN=1 SKIP_LAYOUT_RENDER_GATE=1`);

await generateDeck({
  id,
  topic:
    process.argv[2] ??
    "Показо: AI-генератор презентаций — как outline выбирает layout через MCP (features, process, fact, quote)",
  locale: "ru",
  slideCount: Number(process.argv[3] ?? 6),
  audience: "продуктовая команда",
  theme: "default",
  workDir,
  onPreviewReady: async () => {
    console.info(`[stream] PREVIEW READY → open player for id=${id}`);
  },
});

console.info(`[stream] DONE id=${id}`);
console.info(`[stream] slides: ${workDir}/slides.md`);
console.info(`[stream] outline: ${workDir}/outline.json`);
