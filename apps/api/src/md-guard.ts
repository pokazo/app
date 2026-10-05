import { slidevThemeId } from "./themes.js";

const ALLOWED_LAYOUTS = new Set([
  "default",
  "cover",
  "center",
  "intro",
  "two-cols",
  "image-right",
  "quote",
  "section",
  "end",
  "fact",
  "statement",
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

export function guardMarkdown(md: string, theme = "default"): string {
  const pinned = slidevThemeId(theme);
  let out = md.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<[^>]*\.vue[^>]*>/gi, "");
  out = out.replace(/^layout:\s*([^\n]+)$/gim, (_m, layout: string) => {
    const id = layout.trim().replace(/['"]/g, "");
    return ALLOWED_LAYOUTS.has(id) ? `layout: ${id}` : "layout: default";
  });
  return quoteFrontmatterTitle(pinTheme(out, pinned));
}

export function isSafePath(next: string | null): string {
  if (!next) return "/";
  return /^\/[\w\-/?=&]*$/.test(next) ? next : "/";
}
