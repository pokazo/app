import { z } from "zod";

export const OutlineVisual = z.enum([
  "none",
  "icon",
  "image-right",
  "image-left",
  "two-cols",
  "quote",
  "fact",
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
});

export const Outline = z.object({
  title: z.string(),
  slides: z.array(OutlineSlide).min(4).max(16),
});

export type OutlineT = z.infer<typeof Outline>;
export type OutlineSlide = z.infer<typeof OutlineSlide>;
