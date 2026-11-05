import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { billingLog } from "./billing.js";
import { tryRenderDeckFilmstripThumbs } from "./deck-thumbs.js";
import { config } from "./env.js";
import { pool } from "./migrate.js";
import { applyPokazoCredit, slidesHavePokazoCredit } from "./pokazo-credit.js";
import { buildSlidev, deckServeBase } from "./slidev.js";

/**
 * After the first paid payment: strip Pokazo credit from the user's free decks
 * and rebuild players so the watermark disappears.
 */
export async function stripPokazoCreditsAfterPayment(userId: string): Promise<number> {
  if (!pool) return 0;
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM deck
      WHERE user_id = $1
        AND billing_kind = 'free'
        AND status IN ('ready', 'preview')
      ORDER BY created_at`,
    [userId],
  );

  let stripped = 0;
  for (const { id } of rows) {
    const workDir = join(config.deckDataDir, id);
    const slidesPath = join(workDir, "slides.md");
    if (!existsSync(slidesPath)) continue;
    let md: string;
    try {
      md = await readFile(slidesPath, "utf8");
    } catch {
      continue;
    }
    if (!slidesHavePokazoCredit(md)) continue;
    const next = applyPokazoCredit(md, false);
    await writeFile(slidesPath, next, "utf8");
    try {
      await buildSlidev(workDir, deckServeBase(id));
      await tryRenderDeckFilmstripThumbs({ workDir, deckId: id });
      stripped += 1;
      billingLog("info", "pokazo_credit_stripped", { userId, deckId: id });
    } catch (error) {
      billingLog("error", "pokazo_credit_strip_rebuild_failed", { userId, deckId: id }, error);
    }
  }
  return stripped;
}
