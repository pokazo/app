import { existsSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { writeDeckActivity, activityLabelForPhase } from "./activity.js";
import { mapViewSlideToOutline } from "./rewrite-lock.js";
import { writeRewriteStatus } from "./rewrite-status.js";
import { Outline, parseOutline, type OutlineSlide, type OutlineT } from "./outline.js";
import { SPEECH_JSON, parseSpeechJson, type SpeechDocT } from "./speech.js";
import { buildSlidev, deckServeBase, writeSlides } from "./slidev.js";
import { sanitizePickerTheme } from "./themes.js";

export const SLIDE_COUNT_MIN = 3;
export const SLIDE_COUNT_MAX = 16;
export const EMPTY_SLIDE_HEADING = "Новый слайд";

export type StructureOp =
  | { op: "move"; from: number; to: number }
  | { op: "delete"; viewIndex: number }
  | { op: "insert"; after: number };

export type StructureMutateResult = {
  md: string;
  outline: OutlineT;
  focusViewIndex: number;
  /** Old outline 1-based index → new 1-based index; deleted keys absent. */
  outlineIndexMap: Map<number, number>;
};

export function emptyOutlineSlide(heading = EMPTY_SLIDE_HEADING): OutlineSlide {
  return {
    heading,
    points: [],
    intent: "",
    visual: "statement",
    imageQuery: "",
    iconHint: "",
    kicker: "",
    source: "",
    steps: [],
    stats: [],
    skills: [],
    cards: [],
    features: [],
    process: [],
    palette: "",
    pie: [],
    chartTitle: "",
  };
}

export function emptySlideMarkdown(heading = EMPTY_SLIDE_HEADING): string {
  return `---\nlayout: statement\n---\n\n# ${heading}\n`;
}

/** Split slides.md into raw slide chunks (frontmatter + body), preserving YAML text. */
export function splitRawSlideBlocks(md: string): string[] {
  const src = md.replace(/^\uFEFF/, "");
  const re = /^---\r?\n[\s\S]*?\r?\n---/gm;
  const matches = [...src.matchAll(re)];
  const blocks: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const start = m.index ?? 0;
    const end = i + 1 < matches.length ? matches[i + 1]!.index! : src.length;
    blocks.push(`${src.slice(start, end).replace(/\s+$/, "")}\n`);
  }
  return blocks;
}

export function joinRawSlideBlocks(blocks: string[]): string {
  return `${blocks.map((b) => b.replace(/\s+$/, "")).join("\n\n")}\n`;
}

function identityOutlineMap(n: number): Map<number, number> {
  const map = new Map<number, number>();
  for (let i = 1; i <= n; i++) map.set(i, i);
  return map;
}

function deleteOutlineMap(map: Map<number, number>, removed: number): Map<number, number> {
  const next = new Map<number, number>();
  for (const [oldIdx, newIdx] of map) {
    if (newIdx === removed) continue;
    next.set(oldIdx, newIdx > removed ? newIdx - 1 : newIdx);
  }
  return next;
}

function insertOutlineMap(map: Map<number, number>, afterOutlineIndex: number): Map<number, number> {
  const next = new Map<number, number>();
  for (const [oldIdx, newIdx] of map) {
    next.set(oldIdx, newIdx > afterOutlineIndex ? newIdx + 1 : newIdx);
  }
  return next;
}

export function mutateSlideStructure(
  md: string,
  outline: OutlineT,
  op: StructureOp,
): StructureMutateResult {
  const blocks = splitRawSlideBlocks(md);
  if (blocks.length < 1) throw new Error("no slides");
  const outlineCount = outline.slides.length;
  const viewCount = blocks.length;
  let slides = outline.slides.slice();
  let outlineIndexMap = identityOutlineMap(slides.length);
  let focusViewIndex = 1;

  if (op.op === "move") {
    const from = op.from;
    const to = op.to;
    if (!Number.isInteger(from) || from < 1 || from > viewCount) {
      throw new Error("bad slide");
    }
    if (!Number.isInteger(to) || to < 1 || to > viewCount) throw new Error("bad move");
    if (from === to) {
      return {
        md,
        outline,
        focusViewIndex: from,
        outlineIndexMap,
      };
    }
    type ViewSlot =
      | { kind: "orphan"; block: string }
      | { kind: "outline"; block: string; slide: OutlineSlide; oldIndex: number };
    const slots: ViewSlot[] = [];
    for (let i = 1; i <= viewCount; i++) {
      const mapping = mapViewSlideToOutline(md, i, outlineCount);
      const block = blocks[i - 1]!;
      if (mapping.kind === "orphan-hero") {
        slots.push({ kind: "orphan", block });
      } else {
        slots.push({
          kind: "outline",
          block,
          slide: slides[mapping.outlineSlideIndex - 1]!,
          oldIndex: mapping.outlineSlideIndex,
        });
      }
    }
    const [moved] = slots.splice(from - 1, 1);
    if (!moved) throw new Error("bad slide");
    slots.splice(to - 1, 0, moved);
    for (let i = 0; i < slots.length; i++) {
      blocks[i] = slots[i]!.block;
    }
    blocks.length = slots.length;
    const nextSlides: OutlineSlide[] = [];
    const nextMap = new Map<number, number>();
    for (const slot of slots) {
      if (slot.kind !== "outline") continue;
      nextSlides.push(slot.slide);
      nextMap.set(slot.oldIndex, nextSlides.length);
    }
    slides = nextSlides;
    outlineIndexMap = nextMap;
    focusViewIndex = to;
  } else if (op.op === "delete") {
    const n = op.viewIndex;
    if (!Number.isInteger(n) || n < 1 || n > viewCount) throw new Error("bad slide");
    const mapping = mapViewSlideToOutline(md, n, outlineCount);
    if (mapping.kind === "outline") {
      if (slides.length <= SLIDE_COUNT_MIN) throw new Error("min slides");
      slides.splice(mapping.outlineSlideIndex - 1, 1);
      outlineIndexMap = deleteOutlineMap(outlineIndexMap, mapping.outlineSlideIndex);
    }
    blocks.splice(n - 1, 1);
    if (blocks.length < 1) throw new Error("min slides");
    focusViewIndex = Math.min(n, blocks.length);
  } else {
    const after = op.after;
    if (!Number.isInteger(after) || after < 1 || after > viewCount) {
      throw new Error("bad slide");
    }
    if (slides.length >= SLIDE_COUNT_MAX) throw new Error("max slides");
    const mapping = mapViewSlideToOutline(md, after, outlineCount);
    const emptyMd = emptySlideMarkdown();
    const emptyOutline = emptyOutlineSlide();
    blocks.splice(after, 0, emptyMd);
    if (mapping.kind === "orphan-hero") {
      slides.splice(0, 0, emptyOutline);
      outlineIndexMap = insertOutlineMap(outlineIndexMap, 0);
    } else {
      slides.splice(mapping.outlineSlideIndex, 0, emptyOutline);
      outlineIndexMap = insertOutlineMap(outlineIndexMap, mapping.outlineSlideIndex);
    }
    focusViewIndex = after + 1;
  }

  const nextOutline = Outline.parse({ ...outline, slides });
  return {
    md: joinRawSlideBlocks(blocks),
    outline: nextOutline,
    focusViewIndex,
    outlineIndexMap,
  };
}

export function remapSpeechDoc(
  doc: SpeechDocT,
  outlineIndexMap: Map<number, number>,
  outline: OutlineT,
): SpeechDocT | null {
  const slides = [];
  for (const s of doc.slides) {
    const ni = outlineIndexMap.get(s.index);
    if (ni == null) continue;
    const heading = outline.slides[ni - 1]?.heading ?? s.heading;
    slides.push({ ...s, index: ni, heading });
  }
  slides.sort((a, b) => a.index - b.index);
  if (slides.length < 1) return null;
  return { slides };
}

export async function applySlideStructure(opts: {
  id: string;
  workDir: string;
  op: StructureOp;
  onSlideCount?: (count: number) => Promise<void>;
}): Promise<{ focusViewIndex: number; slideCount: number }> {
  const { id, workDir, op } = opts;
  const outlineRaw = JSON.parse(await readFile(join(workDir, "outline.json"), "utf8"));
  const outline = parseOutline(outlineRaw);
  const slidesMd = await readFile(join(workDir, "slides.md"), "utf8");

  let theme = "default";
  try {
    const input = JSON.parse(await readFile(join(workDir, "input.json"), "utf8")) as {
      theme?: string;
    };
    theme = sanitizePickerTheme(input.theme);
  } catch {
    /* defaults */
  }

  const mutated = mutateSlideStructure(slidesMd, outline, op);
  await writeSlides(workDir, mutated.md, theme);
  await writeFile(join(workDir, "outline.json"), JSON.stringify(mutated.outline, null, 2), "utf8");

  const speechPath = join(workDir, SPEECH_JSON);
  if (existsSync(speechPath)) {
    try {
      const doc = parseSpeechJson(await readFile(speechPath, "utf8"));
      const remapped = remapSpeechDoc(doc, mutated.outlineIndexMap, mutated.outline);
      if (remapped) {
        await writeFile(speechPath, JSON.stringify(remapped, null, 2), "utf8");
      } else {
        await unlink(speechPath);
      }
    } catch {
      /* leave speech as-is on parse failure */
    }
  }

  if (opts.onSlideCount) {
    await opts.onSlideCount(mutated.outline.slides.length);
  }

  try {
    await writeDeckActivity(workDir, activityLabelForPhase("structure-build"));
  } catch {
    /* optional */
  }

  // Must match generate/rewrite: absolute /p/:id/ so BASE_URL keeps images + router
  // under the deck path (base "./" resolves /slide-N.jpg to api origin → 404).
  await buildSlidev(workDir, deckServeBase(id));
  try {
    const { tryRenderDeckFilmstripThumbs } = await import("./deck-thumbs.js");
    await tryRenderDeckFilmstripThumbs({ workDir, deckId: id });
  } catch (err) {
    console.warn(`[structure] thumbs ${id}: ${String(err).slice(0, 200)}`);
  }

  await writeRewriteStatus(workDir, {
    slide: mutated.focusViewIndex,
    status: "done",
    instruction: `structure:${op.op}`,
    updatedAt: new Date().toISOString(),
  });
  try {
    await writeDeckActivity(workDir, "");
  } catch {
    /* optional */
  }

  return {
    focusViewIndex: mutated.focusViewIndex,
    slideCount: mutated.outline.slides.length,
  };
}
