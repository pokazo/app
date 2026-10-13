import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { config } from "./env.js";
import { buildSlidev } from "./slidev.js";
import { guardMarkdown } from "./md-guard.js";
import { withSlidevMcp } from "./slidev-mcp.js";
import { withLayoutMcp } from "./layout-mcp.js";
import { withHeroMcp } from "./hero-mcp.js";
import { createStockTools, type StockToolAttribution } from "./assets-tools.js";
import { createImageGenTools, type GenToolAttribution } from "./assets-gen-tools.js";
import { createYandexImageTools, type YandexToolAttribution } from "./assets-yandex-tools.js";
import { mergeComposeTools, pickHeroTools, pickRewriteTools } from "./generate-helpers.js";
import { Outline, OutlineSlide, type OutlineT } from "./outline.js";
import { emptySlideIssues, formatOutlinePlanIssues, textOnlySlideIssues } from "./outline-plan.js";
import { parseSlideBlocks } from "./layout-md-assert.js";
import {
  applyLockedVisual,
  isHeroRewriteTarget,
  layoutToOutlineVisual,
  lockedSlideLayoutFromMarkdown,
  mapViewSlideToOutline,
  maxViewSlideCount,
  resolveRewriteSlideTargets,
  type LockedSlideLayout,
} from "./rewrite-lock.js";
import {
  composeOneSlideMaxSteps,
  composeOneSlideSkill,
  composeOneSlideUserPrompt,
  isFullRedoInstruction,
  reviseOutlineSlidePrompt,
  rewriteHeroMaxSteps,
  rewriteHeroRepairPrompt,
  rewriteHeroSkill,
  rewriteHeroUserPrompt,
  rewriteRepairPrompt,
} from "./rewrite-skill.js";
import { writeRewriteStatus } from "./rewrite-status.js";
import { sanitizePickerTheme } from "./themes.js";
import { ensureUploadIndex } from "./upload-index.js";
import { withUploadImagesMcp } from "./upload-images-mcp.js";
import { createUploadImageUseTools, type UploadToolAttribution } from "./upload-images-tools.js";
import { hasUploadImages, uploadDirForDeck } from "./upload-store.js";
import {
  activityLabelForPhase,
  activityLabelForTools,
  createActivityPublisher,
  wrapToolsWithActivity,
  writeDeckActivity,
} from "./activity.js";
import { bustSlideImageCache } from "./image-cache-bust.js";

function rewriteActivityPublisher(workDir: string) {
  return createActivityPublisher({
    write: async (label) => {
      try {
        await writeDeckActivity(workDir, label);
      } catch (err) {
        console.warn(`[activity] rewrite write failed: ${String(err).slice(0, 160)}`);
      }
    },
  });
}

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

type Attribution =
  | StockToolAttribution
  | GenToolAttribution
  | YandexToolAttribution
  | UploadToolAttribution;

async function prepareImageTools(opts: {
  workDir: string;
  deckId: string;
  attributions: Attribution[];
}): Promise<{
  yandexTools: Record<string, unknown>;
  stockTools: Record<string, unknown>;
  imageGenTools: Record<string, unknown>;
  uploadUseTools: Record<string, unknown>;
  withOptionalUploadMcp: <T>(
    run: (uploadSearchTools: Record<string, unknown>) => Promise<T>,
  ) => Promise<T>;
}> {
  const yandexTools = createYandexImageTools(opts.workDir, {
    baseUrl: config.yandexImagesUrl,
    onAttribution: (entry) => opts.attributions.push(entry),
  });
  const stockTools = createStockTools(opts.workDir, {
    accessKey: config.unsplashAccessKey,
    apiBase: config.unsplashApiBase,
    imagesBase: config.unsplashImagesBase,
    onAttribution: (entry) => opts.attributions.push(entry),
  });
  const imageGenTools = createImageGenTools(opts.workDir, {
    apiKey: config.openaiApiKey,
    model: config.openaiImageModel,
    apiBase: config.openaiImageApiBase,
    onAttribution: (entry) => opts.attributions.push(entry),
  });

  const uploadDir = hasUploadImages(config.uploadDataDir, opts.deckId)
    ? uploadDirForDeck(config.uploadDataDir, opts.deckId)
    : null;
  if (uploadDir) {
    await ensureUploadIndex({
      uploadRoot: config.uploadDataDir,
      deckId: opts.deckId,
      apiKey: config.openrouterKey || config.openaiApiKey,
      apiBase: config.openrouterKey ? config.openrouterBaseUrl : config.openaiImageApiBase,
      model: config.openrouterKey ? "openai/gpt-4o-mini" : "gpt-4o-mini",
    });
  }
  const uploadUseTools = uploadDir
    ? createUploadImageUseTools(opts.workDir, uploadDir, {
        onAttribution: (entry) => opts.attributions.push(entry),
      })
    : {};
  const withOptionalUploadMcp = async <T>(
    run: (uploadSearchTools: Record<string, unknown>) => Promise<T>,
  ): Promise<T> => {
    if (!uploadDir) return run({});
    return withUploadImagesMcp(uploadDir, run);
  };

  return {
    yandexTools,
    stockTools,
    imageGenTools,
    uploadUseTools,
    withOptionalUploadMcp,
  };
}

async function persistAttributions(workDir: string, attributions: Attribution[]): Promise<void> {
  if (!attributions.length) return;
  try {
    const prev = JSON.parse(await readFile(join(workDir, "assets.json"), "utf8")) as {
      attributions?: unknown[];
    };
    const list = Array.isArray(prev.attributions) ? prev.attributions : [];
    await writeFile(
      join(workDir, "assets.json"),
      JSON.stringify({ attributions: [...list, ...attributions] }, null, 2),
      "utf8",
    );
  } catch {
    await writeFile(
      join(workDir, "assets.json"),
      JSON.stringify({ attributions }, null, 2),
      "utf8",
    );
  }
}

/** Sync outline.visual from the actual Slidev layout after body rewrite. */
async function syncOutlineVisualFromMarkdown(opts: {
  workDir: string;
  outline: OutlineT;
  outlineSlot: number;
  outlineCount: number;
  fallbackVisual: OutlineSlide["visual"];
}): Promise<void> {
  let md = "";
  try {
    md = await readFile(join(opts.workDir, "slides.md"), "utf8");
  } catch {
    return;
  }
  const locked = lockedSlideLayoutFromMarkdown(
    md,
    opts.outlineSlot,
    opts.fallbackVisual,
    opts.outlineCount,
  );
  if (!locked.layout) return;
  const visual = layoutToOutlineVisual(locked.layout, opts.fallbackVisual);
  const prev = opts.outline.slides[opts.outlineSlot - 1];
  if (!prev || prev.visual === visual) return;
  opts.outline.slides[opts.outlineSlot - 1] = { ...prev, visual };
  await writeFile(join(opts.workDir, "outline.json"), JSON.stringify(opts.outline, null, 2), "utf8");
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
  // Hero: keep hero/cover visual. Body: allow visual change from the model.
  const lockVisual = (slide: OutlineSlide) =>
    opts.isHero && opts.locked ? applyLockedVisual(slide, opts.locked) : slide;

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

  const check = (s: OutlineSlide) => [
    ...emptySlideIssues(opts.slideIndex, s),
    ...(opts.isHero ? [] : textOnlySlideIssues(opts.slideIndex, s)),
  ];

  let slide = await once(prompt);
  let issues = check(slide);
  if (!issues.length) return slide;

  slide = await once(`${prompt}

Предыдущая попытка не прошла проверки:
${formatOutlinePlanIssues(issues)}

Исправленный OutlineSlide:`);
  issues = check(slide);
  if (!issues.length) return slide;

  // Full redo often picks structured visuals with incomplete payload — force a photo flip.
  if (!opts.isHero && isFullRedoInstruction(opts.instruction)) {
    const current = opts.locked?.visual || opts.previous.visual;
    const alt = current === "image-left" ? "image-right" : "image-left";
    slide = await once(`${prompt}

FALLBACK FULL REDO: верни OutlineSlide с visual="${alt}" (не features/stats/timeline).
heading новый, points 3–5 полных предложений, imageQuery новый под тему, intent обновлён.
Полный валидный payload для ${alt}.`);
    issues = check(slide);
    if (!issues.length) return slide;
  }

  throw new Error(`outline slide revise failed: ${formatOutlinePlanIssues(issues)}`);
}

type RewriteCtx = {
  id: string;
  workDir: string;
  slideIndex: number;
  instruction: string;
  theme: string;
  locale: string;
  topic: string;
  audience: string;
  researchMarkdown?: string;
  outline: OutlineT;
  outlineCount: number;
  previous: OutlineSlide;
  locked: LockedSlideLayout;
  slidevIndex: number;
  outlineSlot: number | null;
};

async function rewriteHeroSlide(ctx: RewriteCtx): Promise<void> {
  const {
    id,
    workDir,
    slideIndex,
    instruction,
    theme,
    locale,
    topic,
    audience,
    researchMarkdown,
    previous,
    locked,
    outlineSlot,
    outline,
  } = ctx;

  console.info(
    `[rewrite] hero view=${slideIndex} slidev=1 deck=${id} variant=${locked.variant || "-"}`,
  );

  const activity = rewriteActivityPublisher(workDir);
  await activity.set(activityLabelForPhase("rewrite-plan"));

  const revised = await reviseOutlineSlide({
    topic,
    locale,
    audience,
    slideIndex,
    previous,
    instruction,
    researchMarkdown,
    isHero: true,
    locked,
  });
  if (outlineSlot != null) {
    // Keep hero visual; merge text/imageQuery into outline slot 1 when present.
    outline.slides[outlineSlot - 1] = {
      ...revised,
      visual: locked.visual === "cover" ? "cover" : "hero",
    };
    await writeFile(join(workDir, "outline.json"), JSON.stringify(outline, null, 2), "utf8");
  }

  const attributions: Attribution[] = [];
  const images = await prepareImageTools({ workDir, deckId: id, attributions });

  const runHeroMcp = async (system: string, prompt: string, maxSteps: number) => {
    await activity.set(activityLabelForPhase("rewrite"));
    await images.withOptionalUploadMcp(async (uploadSearchTools) => {
      await withHeroMcp(async (heroTools) => {
        await withSlidevMcp(workDir, async (slidevTools) => {
          const tools = wrapToolsWithActivity(
            pickHeroTools(
              mergeComposeTools(
                heroTools,
                slidevTools,
                uploadSearchTools,
                images.uploadUseTools,
                images.yandexTools,
                images.stockTools,
                images.imageGenTools,
              ),
            ),
            (label) => activity.set(label),
          );
          await generateText({
            model: model(config.composeModel),
            system,
            tools: tools as never,
            maxSteps,
            prompt,
            onStepFinish: async (step) => {
              const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
              if (names.length) await activity.set(activityLabelForTools(names));
              if (step.finishReason === "tool-calls") void activity.thinkAfterHold();
            },
          });
        });
      });
    });
  };

  await runHeroMcp(
    rewriteHeroSkill(theme, locale),
    rewriteHeroUserPrompt({
      slide: revised,
      locale,
      topic,
      instruction,
      locked,
    }),
    rewriteHeroMaxSteps(),
  );

  let md = await guardWorkSlides(workDir, theme);
  const base = `/p/${id}/`;
  const buildAndGate = async () => {
    const bust = await bustSlideImageCache({ workDir, slidevIndex: 1 });
    if (bust.changed) {
      console.info(`[rewrite] image cache-bust ${bust.from} → ${bust.to} deck=${id}`);
    }
    md = await guardWorkSlides(workDir, theme);
    await activity.set(activityLabelForPhase("rewrite-build"));
    await buildSlidev(workDir, base);
    if (process.env.SKIP_LAYOUT_RENDER_GATE !== "1") {
      const { assertDeckLayoutsRender } = await import("./layout-render-gate.js");
      await assertDeckLayoutsRender(workDir, id);
    }
  };

  try {
    await buildAndGate();
  } catch (err) {
    console.info(`[rewrite] hero build failed, repair deck=${id}: ${String(err).slice(0, 400)}`);
    await activity.set(activityLabelForPhase("repair"));
    await runHeroMcp(
      rewriteHeroSkill(theme, locale),
      rewriteHeroRepairPrompt({ error: String(err), md, locked }),
      12,
    );
    md = await guardWorkSlides(workDir, theme);
    await buildAndGate();
  }

  await persistAttributions(workDir, attributions);
  await writeRewriteStatus(workDir, {
    slide: slideIndex,
    status: "done",
    instruction,
    updatedAt: new Date().toISOString(),
  });
  try {
    await writeDeckActivity(workDir, "");
  } catch {
    /* optional */
  }
  console.info(`[rewrite] hero done slide=${slideIndex} deck=${id}`);
}

async function rewriteBodySlide(ctx: RewriteCtx): Promise<void> {
  const {
    id,
    workDir,
    slideIndex,
    instruction,
    theme,
    locale,
    topic,
    audience,
    researchMarkdown,
    previous,
    locked,
    slidevIndex,
    outlineSlot,
    outline,
    outlineCount,
  } = ctx;

  console.info(
    `[rewrite] body view=${slideIndex} outline=${outlineSlot} slidev=${slidevIndex} deck=${id} layout=${locked.layout || "?"}`,
  );

  const activity = rewriteActivityPublisher(workDir);
  await activity.set(activityLabelForPhase("rewrite-plan"));

  const revised = await reviseOutlineSlide({
    topic,
    locale,
    audience,
    slideIndex,
    previous,
    instruction,
    researchMarkdown,
    isHero: false,
    locked,
  });
  if (outlineSlot != null) {
    outline.slides[outlineSlot - 1] = revised;
    await writeFile(join(workDir, "outline.json"), JSON.stringify(outline, null, 2), "utf8");
  }

  const attributions: Attribution[] = [];
  const images = await prepareImageTools({ workDir, deckId: id, attributions });

  const runBodyMcp = async (system: string, prompt: string, maxSteps: number) => {
    await activity.set(activityLabelForPhase("rewrite"));
    await images.withOptionalUploadMcp(async (uploadSearchTools) => {
      await withLayoutMcp(async (layoutTools) => {
        await withSlidevMcp(workDir, async (slidevTools) => {
          const tools = wrapToolsWithActivity(
            pickRewriteTools(
              mergeComposeTools(
                layoutTools,
                slidevTools,
                uploadSearchTools,
                images.uploadUseTools,
                images.yandexTools,
                images.stockTools,
                images.imageGenTools,
              ),
            ),
            (label) => activity.set(label),
          );
          await generateText({
            model: model(config.composeModel),
            system,
            tools: tools as never,
            maxSteps,
            prompt,
            onStepFinish: async (step) => {
              const names = (step.toolCalls as Array<{ toolName: string }>).map((t) => t.toolName);
              if (names.length) await activity.set(activityLabelForTools(names));
              if (step.finishReason === "tool-calls") void activity.thinkAfterHold();
            },
          });
        });
      });
    });
  };

  await runBodyMcp(
    composeOneSlideSkill(theme, locale),
    composeOneSlideUserPrompt({
      slideIndex: slidevIndex,
      slide: revised,
      locale,
      topic,
      instruction,
      locked,
    }),
    composeOneSlideMaxSteps(),
  );

  let md = await guardWorkSlides(workDir, theme);
  const base = `/p/${id}/`;
  const buildAndGate = async () => {
    const bust = await bustSlideImageCache({ workDir, slidevIndex });
    if (bust.changed) {
      console.info(`[rewrite] image cache-bust ${bust.from} → ${bust.to} deck=${id}`);
    }
    md = await guardWorkSlides(workDir, theme);
    await activity.set(activityLabelForPhase("rewrite-build"));
    await buildSlidev(workDir, base);
    if (process.env.SKIP_LAYOUT_RENDER_GATE !== "1") {
      const { assertDeckLayoutsRender } = await import("./layout-render-gate.js");
      await assertDeckLayoutsRender(workDir, id);
    }
  };

  try {
    await buildAndGate();
  } catch (err) {
    console.info(
      `[rewrite] body build failed, repair outline=${slideIndex} slidev=${slidevIndex}: ${String(err).slice(0, 400)}`,
    );
    await activity.set(activityLabelForPhase("repair"));
    await runBodyMcp(
      composeOneSlideSkill(theme, locale),
      rewriteRepairPrompt({
        slideIndex: slidevIndex,
        error: String(err),
        md,
        locked,
      }),
      14,
    );
    md = await guardWorkSlides(workDir, theme);
    await buildAndGate();
  }

  if (outlineSlot != null) {
    await syncOutlineVisualFromMarkdown({
      workDir,
      outline,
      outlineSlot,
      outlineCount,
      fallbackVisual: revised.visual,
    });
  }

  await persistAttributions(workDir, attributions);
  await writeRewriteStatus(workDir, {
    slide: slideIndex,
    status: "done",
    instruction,
    updatedAt: new Date().toISOString(),
  });
  try {
    await writeDeckActivity(workDir, "");
  } catch {
    /* optional */
  }
  console.info(`[rewrite] body done slide=${slideIndex} deck=${id}`);
}

/** Entry: dispatch hero vs body rewrite flows. */
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
  let slidesMd = "";
  try {
    slidesMd = await readFile(join(opts.workDir, "slides.md"), "utf8");
  } catch {
    slidesMd = "";
  }
  const outlineCount = outline.slides.length;
  const maxView = maxViewSlideCount(slidesMd, outlineCount);
  if (opts.slideIndex < 1 || opts.slideIndex > maxView) {
    throw new Error("bad slide index");
  }

  let input = {
    topic: "",
    locale: "ru",
    audience: "general",
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
  const audience = input.audience || "general";

  let researchMarkdown: string | undefined;
  try {
    researchMarkdown = await readFile(join(opts.workDir, "research.md"), "utf8");
  } catch {
    researchMarkdown = undefined;
  }

  const mapping = mapViewSlideToOutline(slidesMd, opts.slideIndex, outlineCount);
  let previous: OutlineSlide;
  let locked: LockedSlideLayout;
  let slidevIndex: number;
  let outlineSlot: number | null;

  if (mapping.kind === "orphan-hero") {
    const block = parseSlideBlocks(slidesMd)[0];
    const heading =
      block?.body.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
      outline.title ||
      "Слайд 1";
    locked = lockedSlideLayoutFromMarkdown(slidesMd, 1, "hero");
    previous = {
      heading,
      points: [],
      intent: "hero",
      visual: "hero",
      imageQuery: "",
      iconHint: "",
      kicker: String(block?.fm.kicker ?? ""),
      source: "",
      steps: [],
      stats: [],
      skills: [],
      cards: [],
      features: [],
      process: [],
    };
    slidevIndex = 1;
    outlineSlot = null;
  } else {
    outlineSlot = mapping.outlineSlideIndex;
    previous = outline.slides[outlineSlot - 1]!;
    ({ locked, slidevIndex } = resolveRewriteSlideTargets({
      md: slidesMd,
      outlineSlideIndex: outlineSlot,
      outlineSlideCount: outlineCount,
      fallbackVisual: previous.visual,
    }));
  }

  const ctx: RewriteCtx = {
    id: opts.id,
    workDir: opts.workDir,
    slideIndex: opts.slideIndex,
    instruction,
    theme,
    locale,
    topic,
    audience,
    researchMarkdown,
    outline,
    outlineCount,
    previous,
    locked,
    slidevIndex,
    outlineSlot,
  };

  const useHero = isHeroRewriteTarget(
    slidesMd,
    opts.slideIndex,
    outlineCount,
    previous.visual,
  );
  if (useHero) {
    await rewriteHeroSlide(ctx);
  } else {
    await rewriteBodySlide(ctx);
  }
}
