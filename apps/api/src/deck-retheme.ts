import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { activityLabelForPhase, writeDeckActivity } from "./activity.js";
import { withDeckDistLock } from "./deck-dist-lock.js";
import { withDeckBuildPublish } from "./deck-ws-publish.js";
import { guardMarkdown } from "./md-guard.js";
import { writeRewriteStatus } from "./rewrite-status.js";
import { buildSlidev, deckServeBase } from "./slidev.js";
import {
  SELECTABLE_THEME_IDS,
  type SelectableThemeId,
} from "./themes.js";

export type ApplyDeckThemeOpts = {
  id: string;
  workDir: string;
  theme: string;
  /** Persist picker theme on the deck row (DB). */
  onThemePersisted?: (theme: SelectableThemeId) => Promise<void>;
  /** Override rebuild+thumbs (tests). Default: slidev build + filmstrip. */
  rebuild?: (workDir: string, id: string) => Promise<void>;
};

export type DeckRethemeGate =
  | { ok: true; theme: SelectableThemeId }
  | { ok: false; status: 400 | 404 | 409; error: string; reason?: string; deckStatus?: string };

/** Pre-flight checks for POST /api/decks/:id/theme (owner already verified). */
export function gateDeckRetheme(opts: {
  deckStatus: string;
  hasSlides: boolean;
  busy: "generating" | "rewriting" | null;
  theme: string;
}): DeckRethemeGate {
  const raw = (opts.theme ?? "").trim();
  if (!(SELECTABLE_THEME_IDS as readonly string[]).includes(raw)) {
    return { ok: false, status: 400, error: "bad theme" };
  }
  if (!opts.hasSlides) {
    return { ok: false, status: 404, error: "not found" };
  }
  if (opts.deckStatus !== "ready") {
    return {
      ok: false,
      status: 409,
      error: "deck not ready",
      deckStatus: opts.deckStatus,
    };
  }
  if (opts.busy) {
    return { ok: false, status: 409, error: "busy", reason: opts.busy };
  }
  return { ok: true, theme: raw as SelectableThemeId };
}

export async function applyDeckTheme(
  opts: ApplyDeckThemeOpts,
): Promise<{ theme: SelectableThemeId }> {
  const raw = (opts.theme ?? "").trim();
  if (!(SELECTABLE_THEME_IDS as readonly string[]).includes(raw)) {
    throw new Error("pick a concrete theme (auto not allowed)");
  }
  const theme = raw as SelectableThemeId;

  const { workDir, id } = opts;
  const slidesPath = join(workDir, "slides.md");
  const inputPath = join(workDir, "input.json");
  if (!existsSync(slidesPath)) {
    throw new Error("slides.md missing");
  }

  let input: Record<string, unknown> = {};
  try {
    input = JSON.parse(await readFile(inputPath, "utf8")) as Record<string, unknown>;
  } catch {
    input = {};
  }
  input.theme = theme;
  await writeFile(inputPath, JSON.stringify(input, null, 2), "utf8");

  const md = await readFile(slidesPath, "utf8");
  const guarded = guardMarkdown(md, theme, { forceAllPalettes: true });
  await writeFile(slidesPath, guarded, "utf8");

  if (opts.onThemePersisted) {
    await opts.onThemePersisted(theme);
  }

  try {
    await writeDeckActivity(workDir, activityLabelForPhase("theme-build"));
  } catch {
    /* optional */
  }

  const rebuild =
    opts.rebuild ??
    (async (dir: string, deckId: string) => {
      await withDeckBuildPublish(deckId, "theme", async () => {
        await buildSlidev(dir, deckServeBase(deckId));
      });
      const { recaptureAllFilmstripThumbs } = await import("./deck-thumbs.js");
      await recaptureAllFilmstripThumbs({ workDir: dir, deckId });
    });

  await withDeckDistLock(id, () => rebuild(workDir, id));

  await writeRewriteStatus(workDir, {
    slide: 1,
    status: "done",
    instruction: `theme:${theme}`,
    updatedAt: new Date().toISOString(),
  });
  try {
    await writeDeckActivity(workDir, "");
  } catch {
    /* optional */
  }

  return { theme };
}
