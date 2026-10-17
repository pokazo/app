import { layoutPalette, slidevThemeId } from "./themes.js";
import { normalizeStatsFrontmatter } from "./stats-frontmatter.js";

const ALLOWED_LAYOUTS = new Set([
  "default",
  "cover",
  "center",
  "intro",
  "two-cols",
  "image-right",
  "image-left",
  "image",
  "quote",
  "section",
  "end",
  "fact",
  "statement",
  "timeline",
  "stats",
  "skills",
  "hero",
  "icon",
  "cards",
  "features",
  "process",
  "spotlight",
  "pie",
]);

function quoteYamlScalar(value: string): string {
  const t = value.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t;
  }
  if (/[:#{}[\],&*?]/.test(t)) {
    return `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return t;
}

function quoteFrontmatterTitle(md: string): string {
  const block = md.match(/^---\n([\s\S]*?)\n---/);
  if (!block) return md;
  const fm = block[1].replace(/^title:\s*(.+)$/m, (_m, val: string) => `title: ${quoteYamlScalar(val)}`);
  return md.replace(block[0], `---\n${fm}\n---`);
}

function pinTheme(md: string, theme: string): string {
  if (!md.trim().startsWith("---")) {
    return `---\ntheme: ${theme}\n---\n\n${md}`;
  }
  let out = md.replace(/^theme:\s*.+$/m, `theme: ${theme}`);
  if (!/^theme:/m.test(out.slice(0, 200))) {
    out = out.replace(/^---\n/, `---\ntheme: ${theme}\n`);
  }
  return out;
}

/** Pin palette on every slide frontmatter — Slidev passes layout props per-slide only.
 * Exception: spotlight keeps model-chosen palette when already set (layout picks bg). */
function pinPalette(md: string, palette: string): string {
  if (!md.trim().startsWith("---")) {
    return `---\npalette: ${palette}\n---\n\n${md}`;
  }
  return md.replace(/^---\n([\s\S]*?)\n---/gm, (_full, body: string) => {
    const isSpotlight = /^layout:\s*spotlight\s*$/m.test(body);
    if (isSpotlight && /^palette:\s*\S+/m.test(body)) {
      return `---\n${body}\n---`;
    }
    let fm = body.replace(/^palette:\s*.+$/m, `palette: ${palette}`);
    if (!/^palette:/m.test(fm)) {
      fm = `palette: ${palette}\n${fm}`;
    }
    return `---\n${fm}\n---`;
  });
}

/** Keep only local public paths like /hero.jpg; drop remote or traversal. */
function sanitizeImageFrontmatter(md: string): string {
  return md.replace(/^image:\s*(.+)$/gim, (_m, raw: string) => {
    const val = raw.trim().replace(/^["']|["']$/g, "");
    if (/^https?:\/\//i.test(val) || val.includes("..") || !val.startsWith("/")) {
      return "image: ";
    }
    if (!/^\/[a-zA-Z0-9._/-]+$/.test(val)) {
      return "image: ";
    }
    return `image: ${val}`;
  });
}

const HERO_VARIANTS = new Set([
  "ribbon",
  "corner",
  "inset",
  "fullbleed",
  "product",
]);

/** Drop unknown hero variants (no split / interactive). */
export function sanitizeHeroVariantFrontmatter(md: string): string {
  return md.replace(/^variant:\s*(.+)$/gim, (_m, raw: string) => {
    const val = raw.trim().replace(/^["']|["']$/g, "").toLowerCase();
    return HERO_VARIANTS.has(val) ? `variant: ${val}` : "variant: fullbleed";
  });
}

const LEAN_HEADMATTER = `monaco: false
twoslash: false
remoteAssets: false
record: false
drawings:
  enabled: false`;

/**
 * Pin lean Slidev headmatter so unused tooling stays out of the SPA bundle.
 * Monaco is already tree-shaken when unused; explicit false avoids accidental enable.
 * Build-time win is small (~0–3% on prod fixture); keeps player surface smaller.
 */
export function pinLeanSlidevHeadmatter(md: string): string {
  if (!md.trim().startsWith("---")) {
    return `---\n${LEAN_HEADMATTER}\n---\n\n${md}`;
  }
  const block = md.match(/^---\n([\s\S]*?)\n---/);
  if (!block) return md;
  let body = block[1];
  // Drop prior lean keys / drawings block so re-pin is idempotent.
  body = body
    .replace(/^monaco:\s*.+$/m, "")
    .replace(/^twoslash:\s*.+$/m, "")
    .replace(/^remoteAssets:\s*.+$/m, "")
    .replace(/^record:\s*.+$/m, "")
    .replace(/^drawings:\n(?:[ \t]+.+\n)*/m, "")
    .replace(/^drawings:\s*.+\n?/m, "");
  body = `${LEAN_HEADMATTER}\n${body}`.replace(/\n{3,}/g, "\n\n").trim();
  return md.replace(block[0], `---\n${body}\n---`);
}

export function guardMarkdown(md: string, theme = "default"): string {
  const pinned = slidevThemeId(theme);
  const palette = layoutPalette(theme);
  let out = md.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<[^>]*\.vue[^>]*>/gi, "");
  // Allow carbon-* / mdi-* icon components; strip other unknown custom tags
  out = out.replace(/<\/?([A-Za-z][\w-]*)(\s[^>]*)?\/?>/gi, (full, name: string) => {
    const n = name.toLowerCase();
    if (n === "br" || n === "hr" || n === "img" || n === "a" || n === "span" || n === "div" || n === "p") {
      return full;
    }
    if (n.startsWith("carbon-") || n.startsWith("mdi-")) return full;
    if (n.includes("-") || /^[A-Z]/.test(name)) return "";
    return full;
  });
  out = out.replace(/^layout:\s*([^\n]+)$/gim, (_m, layout: string) => {
    const id = layout.trim().replace(/['"]/g, "");
    return ALLOWED_LAYOUTS.has(id) ? `layout: ${id}` : "layout: default";
  });
  out = sanitizeImageFrontmatter(out);
  out = sanitizeHeroVariantFrontmatter(out);
  out = normalizeStatsFrontmatter(out);
  out = pinLeanSlidevHeadmatter(out);
  return quoteFrontmatterTitle(pinPalette(pinTheme(out, pinned), palette));
}

export function isSafePath(next: string | null): string {
  if (!next) return "/";
  return /^\/[\w\-/?=&]*$/.test(next) ? next : "/";
}
