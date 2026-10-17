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
  /** Feature cards when visual is cards; mapped to frontmatter items. */
  cards: z.array(CardItem).max(4).default([]),
  /** Icon columns when visual is features; mapped to frontmatter items. */
  features: z.array(FeatureItem).max(3).default([]),
  /** Horizontal flow when visual is process. */
  process: z.array(ProcessStep).max(5).default([]),
  /**
   * Layout palette id when visual is spotlight (cream|ink|ocean|…).
   * Empty string for other visuals.
   * Default so decks saved before spotlight/pie still parse for structure ops.
   */
  palette: z.string().default(""),
  /** Pie slices when visual is pie; mapped to frontmatter items. */
  pie: z.array(PieSlice).max(5).default([]),
  /** Chart title above pie when visual is pie; otherwise "". */
  chartTitle: z.string().default(""),
});

export const Outline = z.object({
  title: z.string(),
  slides: z.array(OutlineSlide).min(3).max(16),
});

export type OutlineT = z.infer<typeof Outline>;
export type OutlineSlide = z.infer<typeof OutlineSlide>;
