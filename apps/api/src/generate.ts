import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { config } from "./env.js";
import { buildSlidev, scaffoldMarkdown, writeSlides } from "./slidev.js";
import { guardMarkdown } from "./md-guard.js";
import { withSlidevMcp, type McpCallLog } from "./slidev-mcp.js";
import { slidevThemeId } from "./themes.js";
import { Outline } from "./outline.js";
import { composeSkill } from "./compose-skill.js";
import { createStockTools, type StockToolAttribution } from "./assets-tools.js";
import { composeMaxSteps, mergeComposeTools } from "./generate-helpers.js";

function model(id: string) {
  const openai = createOpenAI({
    apiKey: config.openrouterKey,
    baseURL: config.openrouterBaseUrl,
    headers: {
      "HTTP-Referer": config.llmReferer,
      "X-Title": config.llmTitle,
    },
  });
  return openai(id);
}

async function guardWorkSlides(workDir: string, theme: string): Promise<string> {
  const file = join(workDir, "slides.md");
  const raw = await readFile(file, "utf8");
  const md = guardMarkdown(raw, theme);
  await writeFile(file, md, "utf8");
  return md;
}

type LlmStepLog = {
  phase: "compose" | "repair";
  step: number;
  finishReason: string;
  text?: string;
  toolNames: string[];
};

function summarizeGenerate(
  phase: "compose" | "repair",
  result: {
    finishReason: string;
    text: string;
    usage?: { promptTokens?: number; completionTokens?: number };
    steps: Array<{ finishReason: string; text: string; toolCalls: Array<{ toolName: string }> }>;
  },
) {
  const steps: LlmStepLog[] = result.steps.map((s, i) => ({
    phase,
    step: i + 1,
    finishReason: s.finishReason,
    text: s.text?.slice(0, 400) || undefined,
    toolNames: s.toolCalls.map((t) => t.toolName),
  }));
  console.info(
    `[llm] ${phase} finish=${result.finishReason} steps=${result.steps.length} ` +
      `prompt=${result.usage?.promptTokens ?? "?"} completion=${result.usage?.completionTokens ?? "?"}`,
  );
  for (const s of steps) {
    console.info(`[llm] ${phase} step ${s.step} ${s.finishReason} tools=${s.toolNames.join(",") || "-"}`);
  }
  return {
    phase,
    finishReason: result.finishReason,
    text: result.text?.slice(0, 800) || undefined,
    usage: result.usage,
    steps,
  };
}

export async function generateDeck(opts: {
  id: string;
  topic: string;
  locale: string;
  slideCount: number;
  audience: string;
  theme: string;
  workDir: string;
}): Promise<void> {
  const theme = slidevThemeId(opts.theme);
  const skill = composeSkill(theme, opts.locale);
  const mcpCalls: McpCallLog[] = [];
  const attributions: StockToolAttribution[] = [];
  const llm: unknown[] = [];

  await mkdir(join(opts.workDir, "public"), { recursive: true });

  console.info(`[generate] outline model=${config.outlineModel} compose=${config.composeModel} topic=${opts.topic}`);
  const outline = await generateObject({
    model: model(config.outlineModel),
    schema: Outline,
    prompt: `Тема: ${opts.topic}
Язык: ${opts.locale}
Аудитория: ${opts.audience}
Число слайдов: ${opts.slideCount}
Составь оглавление презентации.

Для каждого слайда укажи: heading, points (0–5 опорных фактов), intent (зачем слайд), visual (cover|end|image-right|image-left|icon|two-cols|quote|fact|section|default|none|…), imageQuery (английский запрос Unsplash или ""), iconHint (для icon или "").
Правила: один cover в начале, end в конце опционально; минимум треть слайдов с visual из image-right, image-left, icon, two-cols, quote, fact; для image-* заполни imageQuery; для icon — iconHint; иначе пустые строки.
Не пиши markdown — только JSON-структуру.`,
  });
  console.info(
    `[generate] outline title="${outline.object.title}" slides=${outline.object.slides.length} ` +
      `usage=${outline.usage.promptTokens}/${outline.usage.completionTokens}`,
  );

  await writeFile(join(opts.workDir, "outline.json"), JSON.stringify(outline.object, null, 2));

  const scaffold = scaffoldMarkdown(outline.object.title, theme);
  await writeSlides(opts.workDir, scaffold, theme);

  const maxSteps = composeMaxSteps(outline.object.slides.length);
  const stockTools = createStockTools(opts.workDir, {
    accessKey: config.unsplashAccessKey,
    onAttribution: (entry) => attributions.push(entry),
  });

  await withSlidevMcp(
    opts.workDir,
    async (slidevTools) => {
      const tools = mergeComposeTools(slidevTools, stockTools);
      const result = await generateText({
        model: model(config.composeModel),
        system: skill,
        tools: tools as never,
        maxSteps,
        prompt: `Собери колоду по outline через tools (update slide 1, then sequential inserts; stock-search/download for image visuals).\noutline:\n${JSON.stringify(outline.object)}\nlocale=${opts.locale}`,
        onStepFinish: async (step) => {
          const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
          console.info(`[llm] compose step finish=${step.finishReason} tools=${names.join(",") || "-"}`);
        },
      });
      llm.push(summarizeGenerate("compose", result));
    },
    (call) => mcpCalls.push(call),
  );

  let md = await guardWorkSlides(opts.workDir, theme);
  const base = `/p/${opts.id}/`;
  let repaired = false;
  try {
    await buildSlidev(opts.workDir, base);
  } catch (err) {
    repaired = true;
    console.info(`[generate] build failed, MCP repair: ${String(err).slice(0, 400)}`);
    await withSlidevMcp(
      opts.workDir,
      async (slidevTools) => {
        const tools = mergeComposeTools(slidevTools, stockTools);
        const result = await generateText({
          model: model(config.composeModel),
          system: skill,
          tools: tools as never,
          maxSteps: 24,
          prompt: `Сборка Slidev упала. Исправь колоду только через tools (MCP update/insert/remove/move и stock при необходимости; не переписывай весь файл текстом).\nОшибка:\n${String(err)}\nТекущий md (справочно):\n${md}`,
          onStepFinish: async (step) => {
            const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
            console.info(`[llm] repair step finish=${step.finishReason} tools=${names.join(",") || "-"}`);
          },
        });
        llm.push(summarizeGenerate("repair", result));
      },
      (call) => mcpCalls.push(call),
    );
    md = await guardWorkSlides(opts.workDir, theme);
    await buildSlidev(opts.workDir, base);
  }

  await writeFile(join(opts.workDir, "assets.json"), JSON.stringify({ attributions }, null, 2));
  const visualSlides = outline.object.slides.filter((s) =>
    ["image-right", "image-left", "icon", "two-cols", "quote", "fact"].includes(s.visual),
  ).length;
  const trace = {
    outlineModel: config.outlineModel,
    composeModel: config.composeModel,
    slideCount: outline.object.slides.length,
    visualSlides,
    stockDownloads: attributions.length,
    repaired,
    mcpCalls,
    attributions,
    llm,
  };
  await writeFile(join(opts.workDir, "compose-trace.json"), JSON.stringify(trace, null, 2));
  console.info(
    `[generate] mcp calls=${mcpCalls.length} stock=${attributions.length} repaired=${repaired} -> ${opts.workDir}`,
  );
}
