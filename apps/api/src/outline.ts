import { z } from "zod";

export const OutlineVisual = z.enum([
  "none",
  "icon",
  "image-right",
  "image-left",
  "two-cols",
  "quote",
  "fact",
  "cards",
  "section",
  "cover",
  "end",
  "default",
  "center",
  "intro",
  "timeline",
  "stats",
  "skills",
  "hero",
  "statement",
  "features",
  "process",
  "spotlight",
  "pie",
  "agenda",
]);

export const TimelineStep = z.object({
  phase: z.string(),
  title: z.string(),
  body: z.string(),
  state: z.enum(["done", "current", "todo"]),
});

export const StatItem = z.object({
  value: z.string(),
  label: z.string(),
  note: z.string(),
});

export const SkillItem = z.object({
  name: z.string(),
  level: z.string(),
  pct: z.number(),
});

export const CardItem = z.object({
  title: z.string(),
  body: z.string(),
});

export const FeatureItem = z.object({
  title: z.string(),
  body: z.string(),
  iconHint: z.string(),
});

export const ProcessStep = z.object({
  title: z.string(),
  iconHint: z.string(),
});

export const PieSlice = z.object({
  label: z.string(),
  value: z.number(),
});

/**
 * OpenAI/Azure strict tools require every `properties` key in `required`.
 * Do not use `.optional()` / `.default()` here — LLM must always send empty
 * arrays/strings when unused. Disk legacy fills via `parseOutline`.
 */
export const OutlineSlide = z.object({
  heading: z.string(),
  points: z.array(z.string()).max(5),
  intent: z.string(),
  visual: OutlineVisual,
  /** English Unsplash query when visual is image-*; otherwise "". */
  imageQuery: z.string(),
  /** Icon hint when visual is icon; otherwise "". */
  iconHint: z.string(),
  kicker: z.string(),
  source: z.string(),
  steps: z.array(TimelineStep).max(5),
  stats: z.array(StatItem).max(4),
  skills: z.array(SkillItem).max(8),
  /** Feature cards when visual is cards|spotlight|agenda; mapped to frontmatter items. */
  cards: z.array(CardItem).max(5),
  /** Icon columns when visual is features; mapped to frontmatter items. */
  features: z.array(FeatureItem).max(3),
  /** Horizontal flow when visual is process. */
  process: z.array(ProcessStep).max(5),
  /**
   * Layout palette id when visual is spotlight|agenda (cream|ink|ocean|…).
   * Empty string for other visuals.
   */
  palette: z.string(),
  /** Pie slices when visual is pie; mapped to frontmatter items. */
  pie: z.array(PieSlice).max(5),
  /** Chart title above pie when visual is pie; otherwise "". */
  chartTitle: z.string(),
});

export const Outline = z.object({
  title: z.string(),
  slides: z.array(OutlineSlide).min(3).max(16),
});

export type OutlineT = z.infer<typeof Outline>;
export type OutlineSlide = z.infer<typeof OutlineSlide>;

/** Defaults for additive slide fields added after older decks were saved. */
export const OUTLINE_SLIDE_DEFAULTS = {
  cards: [] as Array<{ title: string; body: string }>,
  features: [] as Array<{ title: string; body: string; iconHint: string }>,
  process: [] as Array<{ title: string; iconHint: string }>,
  palette: "",
  pie: [] as Array<{ label: string; value: number }>,
  chartTitle: "",
};

/** Fill missing additive fields, then strict-parse (structure ops / rewrite / disk). */
export function parseOutline(raw: unknown): OutlineT {
  if (!raw || typeof raw !== "object") return Outline.parse(raw);
  const obj = raw as { title?: unknown; slides?: unknown };
  if (!Array.isArray(obj.slides)) return Outline.parse(raw);
  const slides = obj.slides.map((slide) => {
    if (!slide || typeof slide !== "object") return slide;
    return { ...OUTLINE_SLIDE_DEFAULTS, ...(slide as object) };
  });
  return Outline.parse({ ...obj, slides });
}

export function safeParseOutline(raw: unknown): z.SafeParseReturnType<unknown, OutlineT> {
  try {
    return { success: true, data: parseOutline(raw) };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err };
    throw err;
  }
}
