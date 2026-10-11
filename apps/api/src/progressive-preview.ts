import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const PREVIEW_BUILD_FILE = "preview-build.json";

export type PreviewBuildMeta = { builtSlideCount: number };

/** How many slides the current preview `dist/` is known to contain. */
export function parsePreviewBuild(raw: unknown): PreviewBuildMeta {
  const n =
    raw && typeof raw === "object" && "builtSlideCount" in raw
      ? Number((raw as { builtSlideCount: unknown }).builtSlideCount)
      : NaN;
  return { builtSlideCount: Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1 };
}

/** Rebuild preview dist when markdown has more slides than the last successful build. */
export function shouldRebuildProgressivePreview(
  mdSlideCount: number,
  builtSlideCount: number,
): boolean {
  return mdSlideCount > builtSlideCount;
}

const MUTATING_SLIDEV = new Set([
  "slidev-insert-slide",
  "slidev-update-slide",
  "slidev-remove-slide",
  "slidev-move-slide",
]);

/** Compose steps that may change slides.md structure/content. */
export function composeStepMayChangeDeck(toolNames: string[]): boolean {
  return toolNames.some((n) => MUTATING_SLIDEV.has(n));
}

export async function readPreviewBuild(workDir: string): Promise<PreviewBuildMeta> {
  try {
    const raw = JSON.parse(await readFile(join(workDir, PREVIEW_BUILD_FILE), "utf8")) as unknown;
    return parsePreviewBuild(raw);
  } catch {
    return { builtSlideCount: 1 };
  }
}

export async function writePreviewBuild(
  workDir: string,
  meta: PreviewBuildMeta,
): Promise<void> {
  await writeFile(
    join(workDir, PREVIEW_BUILD_FILE),
    JSON.stringify({ builtSlideCount: Math.max(1, Math.floor(meta.builtSlideCount)) }, null, 2),
  );
}
