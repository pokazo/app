export type ViewSlide = { index: number; heading: string; image: string | null };

const LOCAL_IMAGE = /^\/[a-zA-Z0-9._-]+$/;

export function slidesFromOutline(raw: unknown, fallbackCount = 0): ViewSlide[] {
  const obj = raw && typeof raw === "object" ? (raw as { slides?: unknown; title?: unknown }) : {};
  const list = Array.isArray(obj.slides) ? obj.slides : [];
  const fromOutline = list.map((item, i) => {
    const heading =
      item && typeof item === "object" && typeof (item as { heading?: unknown }).heading === "string"
        ? (item as { heading: string }).heading.trim()
        : "";
    return { index: i + 1, heading: heading || `Слайд ${i + 1}`, image: null };
  });
  if (fromOutline.length) return fromOutline;
  const n = Math.min(16, Math.max(0, Number(fallbackCount) || 0));
  return Array.from({ length: n }, (_, i) => ({ index: i + 1, heading: `Слайд ${i + 1}`, image: null }));
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

export function withSlideImages(slides: ViewSlide[], images: Array<string | null>): ViewSlide[] {
  return slides.map((s, i) => ({ ...s, image: images[i] ?? null }));
}

export function outlineTitle(raw: unknown, fallback = ""): string {
  if (raw && typeof raw === "object" && typeof (raw as { title?: unknown }).title === "string") {
    const t = (raw as { title: string }).title.trim();
    if (t) return t;
  }
  return fallback;
}
