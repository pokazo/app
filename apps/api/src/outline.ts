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
  cards: z.array(CardItem).max(4),
  /** Icon columns when visual is features; mapped to frontmatter items. */
  features: z.array(FeatureItem).max(3),
  /** Horizontal flow when visual is process. */
  process: z.array(ProcessStep).max(5),
});

export const Outline = z.object({
  title: z.string(),
  slides: z.array(OutlineSlide).min(4).max(16),
});

export type OutlineT = z.infer<typeof Outline>;
export type OutlineSlide = z.infer<typeof OutlineSlide>;
