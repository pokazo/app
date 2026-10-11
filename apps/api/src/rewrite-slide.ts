import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { config } from "./env.js";
import { buildSlidev } from "./slidev.js";
import { guardMarkdown } from "./md-guard.js";
import { withSlidevMcp } from "./slidev-mcp.js";
import { createStockTools, type StockToolAttribution } from "./assets-tools.js";
import { createImageGenTools, type GenToolAttribution } from "./assets-gen-tools.js";
import { createYandexImageTools, type YandexToolAttribution } from "./assets-yandex-tools.js";
import { mergeComposeTools, pickRewriteTools } from "./generate-helpers.js";
import { Outline, OutlineSlide, type OutlineT } from "./outline.js";
import { emptySlideIssues, formatOutlinePlanIssues, textOnlySlideIssues } from "./outline-plan.js";
import {
  applyLockedVisual,
  lockedSlideLayoutFromMarkdown,
  type LockedSlideLayout,
} from "./rewrite-lock.js";
import {
  composeOneSlideMaxSteps,
  composeOneSlideSkill,
  composeOneSlideUserPrompt,
  reviseOutlineSlidePrompt,
  rewriteRepairPrompt,
} from "./rewrite-skill.js";
import { writeRewriteStatus } from "./rewrite-status.js";
import { sanitizePickerTheme } from "./themes.js";
import { ensureUploadIndex } from "./upload-index.js";
import { withUploadImagesMcp } from "./upload-images-mcp.js";
import { createUploadImageUseTools, type UploadToolAttribution } from "./upload-images-tools.js";
import { hasUploadImages, uploadDirForDeck } from "./upload-store.js";

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

export type ReviseOutlineSlideFn = (args: {
  model: unknown;
  schema: typeof OutlineSlide;
  prompt: string;
}) => Promise<{ object: OutlineSlide }>;

export async function reviseOutlineSlide(opts: {
  topic: string;
  locale: string;
  audience: string;
  slideIndex: number;
  previous: OutlineSlide;
  instruction: string;
  researchMarkdown?: string;
  isHero: boolean;
  locked?: LockedSlideLayout;
  /** Injectable for tests — skips OpenRouter client entirely. */
  generateObjectFn?: ReviseOutlineSlideFn;
}): Promise<OutlineSlide> {
  const prompt = reviseOutlineSlidePrompt(opts);
  const lockVisual = (slide: OutlineSlide) =>
    opts.locked ? applyLockedVisual(slide, opts.locked) : slide;

  async function once(p: string): Promise<OutlineSlide> {
    if (opts.generateObjectFn) {
      const result = await opts.generateObjectFn({
        model: null,
        schema: OutlineSlide,
        prompt: p,
      });
      return lockVisual(result.object);
    }
    const result = await generateObject({
      model: model(config.outlineModel),
      schema: OutlineSlide,
      prompt: p,
    });
    return lockVisual(result.object);
  }

  let slide = await once(prompt);
  const issues = [
    ...emptySlideIssues(opts.slideIndex, slide),
    ...(opts.isHero ? [] : textOnlySlideIssues(opts.slideIndex, slide)),
  ];
  if (!issues.length) return slide;

  slide = await once(`${prompt}

Предыдущая попытка не прошла проверки:
${formatOutlinePlanIssues(issues)}

Исправленный OutlineSlide:`);
  const again = [
    ...emptySlideIssues(opts.slideIndex, slide),
    ...(opts.isHero ? [] : textOnlySlideIssues(opts.slideIndex, slide)),
  ];
  if (again.length) {
    throw new Error(`outline slide revise failed: ${formatOutlinePlanIssues(again)}`);
  }
  return slide;
}

export async function rewriteSlide(opts: {
  id: string;
  workDir: string;
  slideIndex: number;
  instruction: string;
}): Promise<void> {
  const instruction = opts.instruction.trim();
  if (instruction.length < 2) throw new Error("bad instruction");

  const outlineRaw = JSON.parse(await readFile(join(opts.workDir, "outline.json"), "utf8"));
  const outline = Outline.parse(outlineRaw) as OutlineT;
  if (opts.slideIndex < 1 || opts.slideIndex > outline.slides.length) {
    throw new Error("bad slide index");
  }

  let input = {
    topic: "",
    locale: "ru",
    audience: "school",
    theme: "default",
  };
  try {
    input = {
      ...input,
      ...(JSON.parse(await readFile(join(opts.workDir, "input.json"), "utf8")) as typeof input),
    };
  } catch {
    /* defaults */
  }
  const theme = sanitizePickerTheme(input.theme);
  const locale = input.locale || "ru";
  const topic = input.topic || outline.title;
  const audience = input.audience || "school";

  let researchMarkdown: string | undefined;
  try {
    researchMarkdown = await readFile(join(opts.workDir, "research.md"), "utf8");
  } catch {
    researchMarkdown = undefined;
  }

  const isHero = opts.slideIndex === 1;
  const previous = outline.slides[opts.slideIndex - 1]!;
  let slidesMd = "";
  try {
    slidesMd = await readFile(join(opts.workDir, "slides.md"), "utf8");
  } catch {
    slidesMd = "";
  }
  const locked = lockedSlideLayoutFromMarkdown(slidesMd, opts.slideIndex, previous.visual);
  console.info(
    `[rewrite] revise outline slide=${opts.slideIndex} deck=${opts.id} lock=${locked.layout || "?"} variant=${locked.variant || "-"}`,
  );
  const revised = await reviseOutlineSlide({
    topic,
    locale,
    audience,
    slideIndex: opts.slideIndex,
    previous,
    instruction,
    researchMarkdown,
    isHero,
    locked,
  });
  outline.slides[opts.slideIndex - 1] = revised;
  await writeFile(join(opts.workDir, "outline.json"), JSON.stringify(outline, null, 2), "utf8");

  const attributions: Array<
    StockToolAttribution | GenToolAttribution | YandexToolAttribution | UploadToolAttribution
  > = [];
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

  const uploadDir = hasUploadImages(config.uploadDataDir, opts.id)
    ? uploadDirForDeck(config.uploadDataDir, opts.id)
    : null;
  if (uploadDir) {
    await ensureUploadIndex({
      uploadRoot: config.uploadDataDir,
      deckId: opts.id,
      apiKey: config.openrouterKey || config.openaiApiKey,
      apiBase: config.openrouterKey ? config.openrouterBaseUrl : config.openaiImageApiBase,
      model: config.openrouterKey ? "openai/gpt-4o-mini" : "gpt-4o-mini",
    });
  }
  const uploadUseTools = uploadDir
    ? createUploadImageUseTools(opts.workDir, uploadDir, {
        onAttribution: (entry) => attributions.push(entry),
      })
    : {};
  const withOptionalUploadMcp = async <T>(
    run: (uploadSearchTools: Record<string, unknown>) => Promise<T>,
  ): Promise<T> => {
    if (!uploadDir) return run({});
    return withUploadImagesMcp(uploadDir, run);
  };

  // Fields-only rewrite: same layout/variant for hero and body slides (no hero catalog).
  console.info(`[rewrite] compose-one slide=${opts.slideIndex} deck=${opts.id} layout=${locked.layout || "?"}`);
  await withOptionalUploadMcp(async (uploadSearchTools) => {
    await withSlidevMcp(opts.workDir, async (slidevTools) => {
      const tools = pickRewriteTools(
        mergeComposeTools(
          slidevTools,
          uploadSearchTools,
          uploadUseTools,
          yandexTools,
          stockTools,
          imageGenTools,
        ),
      );
      await generateText({
        model: model(config.composeModel),
        system: composeOneSlideSkill(theme, locale),
        tools: tools as never,
        maxSteps: composeOneSlideMaxSteps(),
        prompt: composeOneSlideUserPrompt({
          slideIndex: opts.slideIndex,
          slide: revised,
          locale,
          topic,
          instruction,
          locked,
        }),
      });
    });
  });

  let md = await guardWorkSlides(opts.workDir, theme);
  const base = `/p/${opts.id}/`;
  const buildAndGate = async () => {
    await buildSlidev(opts.workDir, base);
    if (process.env.SKIP_LAYOUT_RENDER_GATE !== "1") {
      const { assertDeckLayoutsRender } = await import("./layout-render-gate.js");
      await assertDeckLayoutsRender(opts.workDir, opts.id);
    }
  };

  try {
    await buildAndGate();
  } catch (err) {
    console.info(`[rewrite] build failed, MCP repair slide=${opts.slideIndex}: ${String(err).slice(0, 400)}`);
    await withOptionalUploadMcp(async (uploadSearchTools) => {
      await withSlidevMcp(opts.workDir, async (slidevTools) => {
        const tools = pickRewriteTools(
          mergeComposeTools(
            slidevTools,
            uploadSearchTools,
            uploadUseTools,
            yandexTools,
            stockTools,
            imageGenTools,
          ),
        );
        await generateText({
          model: model(config.composeModel),
          system: composeOneSlideSkill(theme, locale),
          tools: tools as never,
          maxSteps: 12,
          prompt: rewriteRepairPrompt({
            slideIndex: opts.slideIndex,
            error: String(err),
            md,
            locked,
          }),
        });
      });
    });
    md = await guardWorkSlides(opts.workDir, theme);
    await buildAndGate();
  }

  if (attributions.length) {
    try {
      const prev = JSON.parse(await readFile(join(opts.workDir, "assets.json"), "utf8")) as {
        attributions?: unknown[];
      };
      const list = Array.isArray(prev.attributions) ? prev.attributions : [];
      await writeFile(
        join(opts.workDir, "assets.json"),
        JSON.stringify({ attributions: [...list, ...attributions] }, null, 2),
        "utf8",
      );
    } catch {
      await writeFile(
        join(opts.workDir, "assets.json"),
        JSON.stringify({ attributions }, null, 2),
        "utf8",
      );
    }
  }

  await writeRewriteStatus(opts.workDir, {
    slide: opts.slideIndex,
    status: "done",
    instruction,
    updatedAt: new Date().toISOString(),
  });
  console.info(`[rewrite] done slide=${opts.slideIndex} deck=${opts.id}`);
}
