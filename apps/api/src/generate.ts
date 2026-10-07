import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { config } from "./env.js";
import { buildSlidev, installDeckLayouts, scaffoldMarkdown, writeSlides } from "./slidev.js";
import { guardMarkdown } from "./md-guard.js";
import { withSlidevMcp, type McpCallLog } from "./slidev-mcp.js";
import { slidevThemeId } from "./themes.js";
import { Outline } from "./outline.js";
import {
  composeSkill,
  composeUserPrompt,
  outlineRevisePrompt,
  outlineUserPrompt,
} from "./compose-skill.js";
import { createStockTools, type StockToolAttribution } from "./assets-tools.js";
import { composeMaxSteps, mergeComposeTools } from "./generate-helpers.js";
import {
  formatOutlinePlanIssues,
  refineOutlineUntilValid,
  validateOutlinePlan,
} from "./outline-plan.js";

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
  installDeckLayouts(opts.workDir);

  console.info(`[generate] outline model=${config.outlineModel} compose=${config.composeModel} topic=${opts.topic}`);
  const firstOutline = await generateObject({
    model: model(config.outlineModel),
    schema: Outline,
    prompt: outlineUserPrompt({
      topic: opts.topic,
      locale: opts.locale,
      audience: opts.audience,
      slideCount: opts.slideCount,
    }),
  });
  console.info(
    `[generate] outline title="${firstOutline.object.title}" slides=${firstOutline.object.slides.length} ` +
      `usage=${firstOutline.usage.promptTokens}/${firstOutline.usage.completionTokens}`,
  );

  const refined = await refineOutlineUntilValid({
    initial: firstOutline.object,
    slideCount: opts.slideCount,
    maxAttempts: 3,
    revise: async (current, issues) => {
      const reason = formatOutlinePlanIssues(issues);
      console.info(`[generate] outline plan failed tests, revising:\n${reason}`);
      const revised = await generateObject({
        model: model(config.outlineModel),
        schema: Outline,
        prompt: outlineRevisePrompt({
          topic: opts.topic,
          locale: opts.locale,
          audience: opts.audience,
          slideCount: opts.slideCount,
          previous: current,
          issues: reason,
        }),
      });
      console.info(
        `[generate] outline revise title="${revised.object.title}" slides=${revised.object.slides.length} ` +
          `usage=${revised.usage.promptTokens}/${revised.usage.completionTokens}`,
      );
      return revised.object;
    },
  });

  if (refined.issues.length > 0) {
    const reason = formatOutlinePlanIssues(refined.issues);
    console.error(`[generate] outline plan still invalid after ${refined.attempts} attempts:\n${reason}`);
    throw new Error(`Outline plan failed validation:\n${reason}`);
  }
  console.info(`[generate] outline plan ok after ${refined.attempts} attempt(s)`);

  const outline = { object: refined.outline };
  await writeFile(join(opts.workDir, "outline.json"), JSON.stringify(outline.object, null, 2));
  await writeFile(
    join(opts.workDir, "outline-plan-check.json"),
    JSON.stringify(
      {
        attempts: refined.attempts,
        issues: validateOutlinePlan(outline.object, { slideCount: opts.slideCount }),
      },
      null,
      2,
    ),
  );

  const scaffold = scaffoldMarkdown(outline.object.title, theme);
  await writeSlides(opts.workDir, scaffold, theme);

  const maxSteps = composeMaxSteps(outline.object.slides.length);
  const stockTools = createStockTools(opts.workDir, {
    accessKey: config.unsplashAccessKey,
    apiBase: config.unsplashApiBase,
    imagesBase: config.unsplashImagesBase,
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
        prompt: composeUserPrompt(outline.object, opts.locale),
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
    ["image-right", "image-left", "icon", "two-cols", "quote", "fact", "timeline", "stats", "skills", "hero"].includes(
      s.visual,
    ),
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
