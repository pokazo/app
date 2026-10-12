import { parseSlideBlocks } from "./layout-md-assert.js";
import { hasOrphanLeadingHero } from "./rewrite-lock.js";

export type ViewSlide = {
  index: number;
  heading: string;
  image: string | null;
  /** Slidev page number for iframe navigate / thumb embed (may differ from index). */
  slidevIndex: number;
};

const LOCAL_IMAGE = /^\/[a-zA-Z0-9._-]+$/;

export function slidesFromOutline(raw: unknown, fallbackCount = 0): ViewSlide[] {
  const obj = raw && typeof raw === "object" ? (raw as { slides?: unknown; title?: unknown }) : {};
  const list = Array.isArray(obj.slides) ? obj.slides : [];
  const fromOutline = list.map((item, i) => {
    const heading =
      item && typeof item === "object" && typeof (item as { heading?: unknown }).heading === "string"
        ? (item as { heading: string }).heading.trim()
        : "";
    const index = i + 1;
    return {
      index,
      heading: heading || `Слайд ${index}`,
      image: null,
      slidevIndex: index,
    };
  });
  if (fromOutline.length) return fromOutline;
  const n = Math.min(16, Math.max(0, Number(fallbackCount) || 0));
  return Array.from({ length: n }, (_, i) => ({
    index: i + 1,
    heading: `Слайд ${i + 1}`,
    image: null,
    slidevIndex: i + 1,
  }));
}

/** Local `/file.ext` from each Slidev slide frontmatter block (`---` … `---`). */
export function parseSlideImages(md: string): Array<string | null> {
  const blocks = md.replace(/^\uFEFF/, "").matchAll(/^---\r?\n([\s\S]*?)\r?\n---/gm);
  const images: Array<string | null> = [];
  for (const block of blocks) {
    const fm = block[1] ?? "";
    const match = fm.match(/^image:\s*(.+)\s*$/m);
    const raw = match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    images.push(LOCAL_IMAGE.test(raw) ? raw : null);
  }
  return images;
}

export function withSlideImages(
  slides: ViewSlide[],
  images: Array<string | null>,
  opts?: { mdImageOffset?: number },
): ViewSlide[] {
  const offset = Math.max(0, Math.floor(opts?.mdImageOffset ?? 0));
  return slides.map((s, i) => ({
    ...s,
    image: images[i + offset] ?? null,
    slidevIndex: s.index + offset,
  }));
}

/** How many Slidev slides are present in markdown (frontmatter blocks). */
export function countSlidesInMarkdown(md: string): number {
  return parseSlideImages(md).length;
}

function headingFromSlideBody(body: string): string {
  const m = body.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim() ?? "";
}

/**
 * For progressive preview: expose only slides present in the last successful preview `dist/`.
 * Compose mutates slides.md early; listing md slides beyond `builtSlideCount` would make
 * thumbs/stage point at pages the iframe build does not have yet.
 */
export function slidesForView(opts: {
  outlineSlides: ViewSlide[];
  markdown?: string;
  /** When true (preview / still composing), truncate to built preview slides. */
  progressive?: boolean;
  /** How many slides the current preview dist contains (default 1 = hero-only). */
  builtSlideCount?: number;
}): ViewSlide[] {
  const { outlineSlides, markdown, progressive, builtSlideCount } = opts;
  if (!markdown) return outlineSlides;
  const images = parseSlideImages(markdown);
  const outlineCount = outlineSlides.length;
  const orphan = hasOrphanLeadingHero(markdown, outlineCount);

  let slides: ViewSlide[];
  if (orphan) {
    const blocks = parseSlideBlocks(markdown);
    const heroHeading = headingFromSlideBody(blocks[0]?.body ?? "") || "Слайд 1";
    const hero: ViewSlide = {
      index: 1,
      heading: heroHeading,
      image: images[0] ?? null,
      slidevIndex: 1,
    };
    const body = withSlideImages(outlineSlides, images, { mdImageOffset: 1 }).map((s, i) => ({
      ...s,
      index: i + 2,
      slidevIndex: i + 2,
    }));
    slides = [hero, ...body];
  } else {
    slides = withSlideImages(outlineSlides, images);
  }

  if (!progressive) return slides;
  const mdCount = images.length;
  const built = Math.max(1, Math.floor(builtSlideCount ?? 1));
  if (orphan) {
    return slides.filter((s) => s.slidevIndex <= built);
  }
  const n = Math.min(slides.length, mdCount || 1, built);
  return slides.slice(0, Math.max(1, n));
}

export function outlineTitle(raw: unknown, fallback = ""): string {
  if (raw && typeof raw === "object" && typeof (raw as { title?: unknown }).title === "string") {
    const t = (raw as { title: string }).title.trim();
    if (t) return t;
  }
  return fallback;
}
