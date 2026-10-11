import { parseSlideBlocks } from "./layout-md-assert.js";
import { OutlineVisual, type OutlineSlide } from "./outline.js";

export type LockedSlideLayout = {
  layout: string;
  variant: string;
  image: string;
  /** Outline visual forced for this rewrite (same layout family). */
  visual: OutlineSlide["visual"];
};

const LAYOUT_TO_VISUAL: Record<string, OutlineSlide["visual"]> = {
  hero: "hero",
  cover: "cover",
  icon: "icon",
  "image-right": "image-right",
  "image-left": "image-left",
  "two-cols": "two-cols",
  quote: "quote",
  fact: "fact",
  cards: "cards",
  timeline: "timeline",
  stats: "stats",
  skills: "skills",
  statement: "statement",
  features: "features",
  process: "process",
  section: "section",
  end: "end",
  center: "center",
  intro: "intro",
  default: "default",
};

/** Map Slidev layout frontmatter → OutlineSlide.visual; fall back to previous. */
export function layoutToOutlineVisual(
  layout: string,
  fallback: OutlineSlide["visual"],
): OutlineSlide["visual"] {
  const mapped = LAYOUT_TO_VISUAL[layout.trim().toLowerCase()];
  if (mapped && OutlineVisual.safeParse(mapped).success) return mapped;
  return fallback;
}

/** Read locked layout/variant/image for slideIndex (1-based) from slides.md. */
export function lockedSlideLayoutFromMarkdown(
  md: string,
  slideIndex: number,
  fallbackVisual: OutlineSlide["visual"],
): LockedSlideLayout {
  const blocks = parseSlideBlocks(md);
  const block = blocks[slideIndex - 1];
  if (!block) {
    return { layout: "", variant: "", image: "", visual: fallbackVisual };
  }
  const layout = String(block.fm.layout ?? "").trim();
  const variant = String(block.fm.variant ?? "").trim();
  const image = String(block.fm.image ?? "").trim();
  return {
    layout,
    variant,
    image,
    visual: layoutToOutlineVisual(layout, fallbackVisual),
  };
}

/** Force outline slide to keep the locked visual (rewrite cannot change layout). */
export function applyLockedVisual(
  slide: OutlineSlide,
  locked: LockedSlideLayout,
): OutlineSlide {
  return { ...slide, visual: locked.visual || slide.visual };
}
