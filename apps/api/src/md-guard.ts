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

function pinPalette(md: string, palette: string): string {
  if (!md.trim().startsWith("---")) {
    return `---\npalette: ${palette}\n---\n\n${md}`;
  }
  let out = md.replace(/^palette:\s*.+$/m, `palette: ${palette}`);
  if (!/^palette:/m.test(out.slice(0, 240))) {
    out = out.replace(/^---\n/, `---\npalette: ${palette}\n`);
  }
  return out;
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
  out = normalizeStatsFrontmatter(out);
  return quoteFrontmatterTitle(pinPalette(pinTheme(out, pinned), palette));
}

export function isSafePath(next: string | null): string {
  if (!next) return "/";
  return /^\/[\w\-/?=&]*$/.test(next) ? next : "/";
}
