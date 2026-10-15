import {
  assertCardsLayout,
  assertFactLayout,
  assertFeaturesLayout,
  assertHeroLayout,
  assertIconLayout,
  assertImageLayout,
  assertProcessLayout,
  assertQuoteLayout,
  assertSkillsLayout,
  assertSpotlightBodyContent,
  assertSpotlightLayout,
  assertStatementLayout,
  assertStatsLayout,
  assertTimelineLayout,
  assertTwoColsLayout,
  layoutError,
} from "../slidev-layouts/layout-assert.js";
import { IMAGE_SPLIT_CONTENT_LIMITS } from "./layout-catalog.js";

type Fm = Record<string, unknown>;

function stripQuotes(s: string): string {
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

/** Minimal YAML-ish frontmatter parse for layout asserts (scalars + lists of maps). */
export function parseSimpleYaml(yaml: string): Fm {
  const fm: Fm = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1]!;
    const raw = m[2]!;
    if (raw === "" || raw === "|" || raw === ">") {
      const items: Record<string, string>[] = [];
      i++;
      let cur: Record<string, string> | null = null;
      let lastProp: string | null = null;
      while (i < lines.length) {
        const L = lines[i]!;
        if (/^[A-Za-z0-9_-]+:/.test(L) && !/^\s/.test(L)) break;
        // `- key: val` or bare `-` / `- ` with props on following indented lines
        const itemStart =
          /^\s*-\s+(?:(\w+):\s*(.*))?$/.exec(L) || /^\s*-\s*$/.exec(L);
        if (itemStart) {
          if (cur) items.push(cur);
          cur = {};
          lastProp = null;
          if (itemStart[1]) {
            cur[itemStart[1]] = stripQuotes(itemStart[2] ?? "");
            lastProp = itemStart[1];
          }
          i++;
          continue;
        }
        const prop = /^\s+(\w+):\s*(.*)$/.exec(L);
        if (prop && cur) {
          cur[prop[1]!] = stripQuotes(prop[2] ?? "");
          lastProp = prop[1]!;
          i++;
          continue;
        }
        // Folded / plain multi-line scalars: indented continuation of last prop.
        // Compose often wraps long body: across lines; without this we stop after
        // the first card and throw LayoutError[cards] (≥2 titles).
        const cont = /^\s+(\S.*)$/.exec(L);
        if (cont && cur && lastProp) {
          const piece = cont[1]!.trim();
          const prev = cur[lastProp] ?? "";
          cur[lastProp] = prev ? `${prev} ${piece}` : piece;
          i++;
          continue;
        }
        if (/^\s*$/.test(L)) {
          i++;
          continue;
        }
        break;
      }
      if (cur) items.push(cur);
      if (items.length) fm[key] = items;
      continue;
    }
    fm[key] = stripQuotes(raw);
    i++;
  }
  return fm;
}

function asList(v: unknown): Record<string, string>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x && typeof x === "object") as Record<string, string>[];
}

export type SlideBlock = { fm: Fm; body: string };

/** Half-pane image-* copy budget (mirrors layout catalog fields[].limit). */
export function assertImageSplitContent(
  layout: "image-right" | "image-left",
  opts: { kicker?: string; body: string },
): void {
  const kicker = (opts.kicker || "").trim();
  if (kicker.length > IMAGE_SPLIT_CONTENT_LIMITS.maxKickerChars) {
    throw layoutError(
      layout,
      `kicker too long (${kicker.length}>${IMAGE_SPLIT_CONTENT_LIMITS.maxKickerChars}); use 2–5 short words (layout-get fields[].limit)`,
    );
  }
  const bullets = [...opts.body.matchAll(/^\s*[-*+]\s+\S/gm)];
  if (bullets.length > IMAGE_SPLIT_CONTENT_LIMITS.maxBullets) {
    throw layoutError(
      layout,
      `at most ${IMAGE_SPLIT_CONTENT_LIMITS.maxBullets} bullets (got ${bullets.length}); half-pane clips overflow — see layout-get fields[].limit`,
    );
  }
}

/** Each `---` … `---` frontmatter block + following body until next `---`. */
export function parseSlideBlocks(md: string): SlideBlock[] {
  const src = md.replace(/^\uFEFF/, "");
  const re = /^---\r?\n([\s\S]*?)\r?\n---/gm;
  const matches = [...src.matchAll(re)];
  const blocks: SlideBlock[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const fm = parseSimpleYaml(m[1] ?? "");
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1]!.index! : src.length;
    const body = src.slice(start, end).replace(/^\r?\n/, "");
    blocks.push({ fm, body });
  }
  return blocks;
}

/** Throw LayoutError[*] if any slide's frontmatter/body cannot be shown. */
export function assertLayoutsInMarkdown(md: string): void {
  for (const { fm, body } of parseSlideBlocks(md)) {
    const layout = String(fm.layout || "");
    if (!layout) continue;
    switch (layout) {
      case "stats":
        assertStatsLayout({ items: asList(fm.items), stats: asList(fm.stats) });
        break;
      case "cards":
        assertCardsLayout({ items: asList(fm.items), cards: asList(fm.cards) });
        break;
      case "skills":
        assertSkillsLayout({ items: asList(fm.items) });
        break;
      case "timeline":
        assertTimelineLayout({ steps: asList(fm.steps) });
        break;
      case "icon":
        assertIconLayout({ iconHint: String(fm.iconHint || "") });
        break;
      case "image-left":
        assertImageLayout("image-left", { image: String(fm.image || "") });
        assertImageSplitContent("image-left", {
          kicker: fm.kicker != null ? String(fm.kicker) : "",
          body,
        });
        break;
      case "image-right":
        assertImageLayout("image-right", { image: String(fm.image || "") });
        assertImageSplitContent("image-right", {
          kicker: fm.kicker != null ? String(fm.kicker) : "",
          body,
        });
        break;
      case "hero":
        assertHeroLayout({
          variant: String(fm.variant || ""),
          image: fm.image != null ? String(fm.image) : null,
        });
        break;
      case "quote":
        assertQuoteLayout({ hasBodySlot: /(?:^|\n)#\s+\S/.test(body) });
        break;
      case "fact":
        assertFactLayout({ hasBodySlot: /(?:^|\n)#\s+\S/.test(body) });
        break;
      case "statement":
        assertStatementLayout({ hasBodySlot: /(?:^|\n)#\s+\S/.test(body) });
        break;
      case "features":
        assertFeaturesLayout({
          items: asList(fm.items),
          features: asList(fm.features),
        });
        break;
      case "process":
        assertProcessLayout({ steps: asList(fm.steps) });
        break;
      case "spotlight":
        assertSpotlightLayout({
          image: String(fm.image || ""),
          palette: String(fm.palette || ""),
          kicker: fm.kicker != null ? String(fm.kicker) : "",
          items: asList(fm.items),
          cards: asList(fm.cards),
        });
        assertSpotlightBodyContent(body);
        break;
      case "two-cols":
        assertTwoColsLayout({
          hasLeftSlot: /::left::/i.test(body),
          hasRightSlot: /::right::/i.test(body),
        });
        break;
      default:
        break;
    }
  }
}
