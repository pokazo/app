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

function isHeroOrCoverLayout(layout: string): boolean {
  const n = layout.trim().toLowerCase();
  return n === "hero" || n === "cover";
}

/**
 * Outline index → Slidev page (both 1-based).
 * When compose left an extra leading hero/cover and then all outline slides,
 * md has outlineCount+1 blocks; outline N is Slidev N+1.
 */
export function slidevIndexForOutlineSlide(
  md: string,
  outlineSlideIndex: number,
  outlineSlideCount: number,
): number {
  if (outlineSlideIndex < 1 || outlineSlideCount < 1) return outlineSlideIndex;
  const blocks = parseSlideBlocks(md);
  const first = String(blocks[0]?.fm.layout ?? "");
  if (blocks.length === outlineSlideCount + 1 && isHeroOrCoverLayout(first)) {
    return outlineSlideIndex + 1;
  }
  return outlineSlideIndex;
}

/** Read locked layout/variant/image for outline slideIndex (1-based) from slides.md. */
export function lockedSlideLayoutFromMarkdown(
  md: string,
  slideIndex: number,
  fallbackVisual: OutlineSlide["visual"],
  outlineSlideCount?: number,
): LockedSlideLayout {
  const blocks = parseSlideBlocks(md);
  const slidevIndex =
    outlineSlideCount != null
      ? slidevIndexForOutlineSlide(md, slideIndex, outlineSlideCount)
      : slideIndex;
  const block = blocks[slidevIndex - 1];
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

/** Outline rewrite target → Slidev page + locked layout for compose MCP. */
export function resolveRewriteSlideTargets(opts: {
  md: string;
  outlineSlideIndex: number;
  outlineSlideCount: number;
  fallbackVisual: OutlineSlide["visual"];
}): { slidevIndex: number; locked: LockedSlideLayout; isHero: boolean } {
  const slidevIndex = slidevIndexForOutlineSlide(
    opts.md,
    opts.outlineSlideIndex,
    opts.outlineSlideCount,
  );
  const locked = lockedSlideLayoutFromMarkdown(
    opts.md,
    opts.outlineSlideIndex,
    opts.fallbackVisual,
    opts.outlineSlideCount,
  );
  const isHero = isHeroOrCoverLayout(locked.layout);
  return { slidevIndex, locked, isHero };
}
