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

export function guardMarkdown(md: string): string {
  let out = md.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<[^>]*\.vue[^>]*>/gi, "");
  out = out.replace(/^layout:\s*([^\n]+)$/gim, (_m, layout: string) => {
    const id = layout.trim().replace(/['"]/g, "");
    return ALLOWED_LAYOUTS.has(id) ? `layout: ${id}` : "layout: default";
  });
  if (!out.trim().startsWith("---")) {
    out = `---\ntheme: default\n---\n\n${out}`;
  } else {
    out = out.replace(/^theme:\s*.+$/m, "theme: default");
    if (!/^theme:/m.test(out.slice(0, 200))) {
      out = out.replace(/^---\n/, "---\ntheme: default\n");
    }
  }
  return out;
}

export function isSafePath(next: string | null): string {
  if (!next) return "/";
  return /^\/[\w\-/?=&]*$/.test(next) ? next : "/";
}
