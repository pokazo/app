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
]);

export const OutlineSlide = z.object({
  heading: z.string(),
  points: z.array(z.string()).max(5),
  intent: z.string(),
  visual: OutlineVisual,
  /** English Unsplash query when visual is image-*; otherwise "". */
  imageQuery: z.string(),
  /** Icon hint when visual is icon; otherwise "". */
  iconHint: z.string(),
});

export const Outline = z.object({
  title: z.string(),
  slides: z.array(OutlineSlide).min(4).max(16),
});

export type OutlineT = z.infer<typeof Outline>;
