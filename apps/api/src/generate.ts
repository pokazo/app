import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { config } from "./env.js";
import { buildSlidev, installDeckLayouts, scaffoldMarkdown, writeSlides } from "./slidev.js";
import { guardMarkdown } from "./md-guard.js";
import { withSlidevMcp, type McpCallLog } from "./slidev-mcp.js";
import { withHeroMcp } from "./hero-mcp.js";
import { composeSkill, composeUserPrompt } from "./compose-skill.js";
import { heroMaxSteps, heroSkill, heroUserPrompt } from "./hero-skill.js";
import { createStockTools, type StockToolAttribution } from "./assets-tools.js";
import { createImageGenTools, type GenToolAttribution } from "./assets-gen-tools.js";
import { createYandexImageTools, type YandexToolAttribution } from "./assets-yandex-tools.js";
import {
  composeMaxSteps,
  mergeComposeTools,
  pickHeroTools,
  stripComposeInspectTools,
} from "./generate-helpers.js";
import { validateOutlinePlan } from "./outline-plan.js";
import { generateOutlineWithLayoutMcp } from "./outline-layout-agent.js";
import { runTopicResearch } from "./research.js";
import { createPhaseTimer } from "./timing.js";
import {
  composeStepMayChangeDeck,
  shouldRebuildProgressivePreview,
  writePreviewBuild,
} from "./progressive-preview.js";
import { countSlidesInMarkdown } from "./view-meta.js";

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
  phase: "hero" | "compose" | "repair";
  step: number;
  finishReason: string;
  text?: string;
  toolNames: string[];
};

function summarizeGenerate(
  phase: "hero" | "compose" | "repair",
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
  /** Called after hero slide is built so the player can open early. */
  onPreviewReady?: () => Promise<void>;
}): Promise<void> {
  const theme = opts.theme;
  const skill = composeSkill(theme, opts.locale);
  const heroSystem = heroSkill(theme, opts.locale);
  const mcpCalls: McpCallLog[] = [];
  const attributions: Array<StockToolAttribution | GenToolAttribution | YandexToolAttribution> = [];
  const llm: unknown[] = [];
  const timer = createPhaseTimer(`deck=${opts.id}`);
  const stepTimers = new Map<"hero" | "compose" | "repair", number>();

  await mkdir(join(opts.workDir, "public"), { recursive: true });
  installDeckLayouts(opts.workDir);

  console.info(
    `[generate] outline model=${config.outlineModel} compose=${config.composeModel} topic=${opts.topic}`,
  );

  console.info(`[generate] research start topic=${opts.topic}`);
  const research = await runTopicResearch({
    topic: opts.topic,
    locale: opts.locale,
    audience: opts.audience,
    apiKey: config.yandexSearchApiKey,
    folderId: config.yandexFolderId,
    model: model(config.outlineModel),
  });
  await writeFile(join(opts.workDir, "research.md"), research.markdown, "utf8");
  await writeFile(
    join(opts.workDir, "research-meta.json"),
    JSON.stringify(
      {
        used: research.used,
        searchCalls: research.searchCalls,
        usage: research.usage,
      },
      null,
      2,
    ),
  );
  timer.mark("research");
  console.info(
    `[generate] research done used=${research.used} searchCalls=${research.searchCalls} ` +
      `chars=${research.markdown.length}`,
  );

  console.info(`[generate] outline via layout MCP start`);
  const outlined = await generateOutlineWithLayoutMcp({
    model: model(config.outlineModel),
    reviseModel: model(config.outlineModel),
    topic: opts.topic,
    locale: opts.locale,
    audience: opts.audience,
    slideCount: opts.slideCount,
    researchMarkdown: research.markdown,
    onMcpCall: (call) => mcpCalls.push(call),
  });
  timer.mark("outline");
  console.info(
    `[generate] outline via=${outlined.via} title="${outlined.outline.title}" slides=${outlined.outline.slides.length} ` +
      `layoutMcpCalls=${outlined.mcpCalls.length}`,
  );

  const outline = { object: outlined.outline };
  await writeFile(join(opts.workDir, "outline.json"), JSON.stringify(outline.object, null, 2));
  await writeFile(
    join(opts.workDir, "outline-plan-check.json"),
    JSON.stringify(
      {
        via: outlined.via,
        issues: validateOutlinePlan(outline.object, { slideCount: opts.slideCount }),
        layoutMcpCalls: outlined.mcpCalls.length,
      },
      null,
      2,
    ),
  );

  const scaffold = scaffoldMarkdown(outline.object.title, theme);
  await writeSlides(opts.workDir, scaffold, theme);

  const maxSteps = composeMaxSteps(outline.object.slides.length);
  const yandexTools = createYandexImageTools(opts.workDir, {
    baseUrl: config.yandexImagesUrl,
    onAttribution: (entry) => attributions.push(entry),
  });
  const stockTools = createStockTools(opts.workDir, {
    accessKey: config.unsplashAccessKey,
    apiBase: config.unsplashApiBase,
    imagesBase: config.unsplashImagesBase,
    onAttribution: (entry) => attributions.push(entry),
  });
  const imageGenTools = createImageGenTools(opts.workDir, {
    apiKey: config.openaiApiKey,
    model: config.openaiImageModel,
    apiBase: config.openaiImageApiBase,
    onAttribution: (entry) => attributions.push(entry),
  });

  console.info(`[generate] hero-compose start`);
  stepTimers.set("hero", Date.now());
  await withSlidevMcp(
    opts.workDir,
    async (slidevTools) => {
      // Hero catalog MCP is nested here only — outline/compose never open withHeroMcp.
      await withHeroMcp(async (heroCatalogTools) => {
        const tools = pickHeroTools(
          mergeComposeTools(slidevTools, heroCatalogTools, yandexTools, stockTools, imageGenTools),
        );
        const result = await generateText({
          model: model(config.composeModel),
          system: heroSystem,
          tools: tools as never,
          maxSteps: heroMaxSteps(),
          prompt: heroUserPrompt({
            outline: outline.object,
            locale: opts.locale,
            topic: opts.topic,
          }),
          onStepFinish: async (step) => {
            const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
            const prev = stepTimers.get("hero") ?? Date.now();
            const ms = Date.now() - prev;
            stepTimers.set("hero", Date.now());
            console.info(
              `[llm] hero step finish=${step.finishReason} ms=${ms} tools=${names.join(",") || "-"}`,
            );
          },
        });
        llm.push(summarizeGenerate("hero", result));
      }, (call) => mcpCalls.push(call));
    },
    (call) => mcpCalls.push(call),
  );
  await guardWorkSlides(opts.workDir, theme);
  timer.mark("hero");
  console.info(`[generate] hero-compose done`);

  const base = `/p/${opts.id}/`;
  const buildAndGate = async (label: string) => {
    const t0 = Date.now();
    await buildSlidev(opts.workDir, base);
    const buildMs = Date.now() - t0;
    let gateMs = 0;
    if (process.env.SKIP_LAYOUT_RENDER_GATE !== "1") {
      const g0 = Date.now();
      const { assertDeckLayoutsRender } = await import("./layout-render-gate.js");
      await assertDeckLayoutsRender(opts.workDir, opts.id);
      gateMs = Date.now() - g0;
    }
    console.info(`[timing] ${label} build=${buildMs}ms gate=${gateMs}ms`);
  };

  let builtSlideCount = 0;
  // Early build of slide 1 so the player can open while the rest compose.
  try {
    await buildAndGate("preview");
    timer.mark("preview");
    const heroMd = await readFile(join(opts.workDir, "slides.md"), "utf8");
    builtSlideCount = Math.max(1, countSlidesInMarkdown(heroMd));
    await writePreviewBuild(opts.workDir, { builtSlideCount });
    console.info(`[generate] preview build ok (slides=${builtSlideCount})`);
    if (opts.onPreviewReady) {
      await opts.onPreviewReady();
      console.info(`[generate] preview status published`);
    }
  } catch (err) {
    console.warn(`[generate] preview build skipped: ${String(err).slice(0, 300)}`);
  }

  // Rebuild preview dist as compose inserts pages so the player reveals them one-by-one.
  let progressiveBusy = false;
  let progressivePending = false;
  const publishProgressivePreview = async () => {
    if (progressiveBusy) {
      progressivePending = true;
      return;
    }
    progressiveBusy = true;
    try {
      do {
        progressivePending = false;
        let md: string;
        try {
          md = await readFile(join(opts.workDir, "slides.md"), "utf8");
        } catch {
          continue;
        }
        const mdCount = countSlidesInMarkdown(md);
        if (!shouldRebuildProgressivePreview(mdCount, builtSlideCount)) continue;
        try {
          const t0 = Date.now();
          await buildSlidev(opts.workDir, base);
          builtSlideCount = mdCount;
          await writePreviewBuild(opts.workDir, { builtSlideCount });
          console.info(
            `[generate] progressive preview ok slides=${builtSlideCount} build=${Date.now() - t0}ms`,
          );
        } catch (err) {
          console.warn(
            `[generate] progressive preview skipped slides=${mdCount}: ${String(err).slice(0, 300)}`,
          );
        }
      } while (progressivePending);
    } finally {
      progressiveBusy = false;
    }
  };

  stepTimers.set("compose", Date.now());
  await withSlidevMcp(
    opts.workDir,
    async (slidevTools) => {
      const tools = stripComposeInspectTools(
        mergeComposeTools(slidevTools, yandexTools, stockTools, imageGenTools),
      );
      const result = await generateText({
        model: model(config.composeModel),
        system: skill,
        tools: tools as never,
        maxSteps,
        prompt: composeUserPrompt(outline.object, opts.locale),
        onStepFinish: async (step) => {
          const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
          const prev = stepTimers.get("compose") ?? Date.now();
          const ms = Date.now() - prev;
          stepTimers.set("compose", Date.now());
          console.info(
            `[llm] compose step finish=${step.finishReason} ms=${ms} tools=${names.join(",") || "-"}`,
          );
          if (composeStepMayChangeDeck(names)) {
            // Don't block the LLM on Slidev build — coalesce rebuilds in the background.
            void publishProgressivePreview();
          }
        },
      });
      llm.push(summarizeGenerate("compose", result));
    },
    (call) => mcpCalls.push(call),
  );
  timer.mark("compose");
  await publishProgressivePreview();

  let md = await guardWorkSlides(opts.workDir, theme);
  let repaired = false;
  try {
    await buildAndGate("final");
    timer.mark("final_build");
  } catch (err) {
    repaired = true;
    console.info(`[generate] build failed, MCP repair: ${String(err).slice(0, 400)}`);
    stepTimers.set("repair", Date.now());
    await withSlidevMcp(
      opts.workDir,
      async (slidevTools) => {
        const tools = mergeComposeTools(slidevTools, yandexTools, stockTools, imageGenTools);
        const result = await generateText({
          model: model(config.composeModel),
          system: skill,
          tools: tools as never,
          maxSteps: 24,
          prompt: `Сборка Slidev / layout render упала. Исправь колоду только через tools (MCP update/insert/remove/move, yandex-image / stock / image-generate при необходимости; не переписывай весь файл текстом). Если ошибка LayoutError[<layout>] — почини frontmatter/body именно этого слайда (stats/cards ≥2 items, timeline ≥3 steps, image-* local image:, hero valid variant+image when required). Слайд 1 (hero) уже готов — не ломай его layout/variant/image без необходимости.\nОшибка:\n${String(err)}\nТекущий md (справочно):\n${md}`,
          onStepFinish: async (step) => {
            const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
            const prev = stepTimers.get("repair") ?? Date.now();
            const ms = Date.now() - prev;
            stepTimers.set("repair", Date.now());
            console.info(
              `[llm] repair step finish=${step.finishReason} ms=${ms} tools=${names.join(",") || "-"}`,
            );
          },
        });
        llm.push(summarizeGenerate("repair", result));
      },
      (call) => mcpCalls.push(call),
    );
    timer.mark("repair");
    md = await guardWorkSlides(opts.workDir, theme);
    await buildAndGate("final_after_repair");
    timer.mark("final_build");
  }

  // Speech is lazy: generated on first open via POST /api/decks/:id/speech/regenerate

  await writeFile(join(opts.workDir, "assets.json"), JSON.stringify({ attributions }, null, 2));
  const visualSlides = outline.object.slides.filter((s) =>
    [
      "image-right",
      "image-left",
      "icon",
      "two-cols",
      "quote",
      "fact",
      "cards",
      "timeline",
      "stats",
      "skills",
      "hero",
    ].includes(s.visual),
  ).length;
  const heroPhase = llm.find(
    (entry) => entry && typeof entry === "object" && "phase" in entry && (entry as { phase?: string }).phase === "hero",
  );
  const timings = timer.summary();
  const trace = {
    outlineModel: config.outlineModel,
    composeModel: config.composeModel,
    slideCount: outline.object.slides.length,
    visualSlides,
    stockDownloads: attributions.length,
    repaired,
    researchUsed: research.used,
    researchSearchCalls: research.searchCalls,
    heroComposed: Boolean(heroPhase),
    timings,
    mcpCalls,
    attributions,
    llm,
  };
  await writeFile(join(opts.workDir, "compose-trace.json"), JSON.stringify(trace, null, 2));
  await writeFile(join(opts.workDir, "timings.json"), JSON.stringify(timings, null, 2));
  console.info(`[timing] deck=${opts.id} summary=${JSON.stringify(timings)}`);
  console.info(
    `[generate] mcp calls=${mcpCalls.length} stock=${attributions.length} repaired=${repaired} -> ${opts.workDir}`,
  );
}
