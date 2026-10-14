import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./env.js";
import { pool } from "./migrate.js";
import { generateDeck } from "./generate.js";
import { rewriteSlide } from "./rewrite-slide.js";
import { isRewriteBuilding, readRewriteStatus, writeRewriteStatus } from "./rewrite-status.js";
import { applySlideStructure, type StructureOp } from "./slide-structure.js";
import { sanitizePickerTheme } from "./themes.js";
import { billingLog, finalizeDeckBilling } from "./billing.js";

let queue: Queue | null = null;
let workerStarted = false;

function redis() {
  return new Redis(config.redisUrl, { maxRetriesPerRequest: null });
}

export function startDeckWorker(): Queue | null {
  if (!config.redisUrl) return null;
  try {
    if (!queue) queue = new Queue("decks", { connection: redis() });
    if (!workerStarted) {
      workerStarted = true;
      new Worker(
        "decks",
        async (job) => {
          if (job.name === "rewrite-slide") {
            const id = String(job.data.id);
            const slide = Number(job.data.slide);
            const instruction = String(job.data.instruction ?? "");
            await processRewriteSlide(id, slide, instruction);
            return;
          }
          if (job.name === "structure-slide") {
            await processStructureSlide(String(job.data.id), job.data.op as StructureOp);
            return;
          }
          const maxAttempts = job.opts.attempts ?? 1;
          await processDeck(String(job.data.id), {
            finalAttempt: job.attemptsMade + 1 >= maxAttempts,
          });
        },
        {
          connection: redis(),
          concurrency: 1,
        },
      );
    }
    return queue;
  } catch (err) {
    console.error("redis worker", err);
    return null;
  }
}

export async function processDeck(
  id: string,
  options: { finalAttempt?: boolean } = {},
): Promise<void> {
  const finalAttempt = options.finalAttempt ?? true;
  if (!pool) throw new Error("no db");
  const db = pool;
  await db.query(
    `UPDATE deck SET status='generating', error=NULL, updated_at=now() WHERE id=$1`,
    [id],
  );
  const { rows } = await db.query(`SELECT * FROM deck WHERE id=$1`, [id]);
  const deck = rows[0];
  if (!deck) throw new Error("deck not found");
  const workDir = join(config.deckDataDir, id);
  await mkdir(workDir, { recursive: true });
  await writeFile(
    join(workDir, "input.json"),
    JSON.stringify({
      topic: deck.topic,
      locale: deck.locale,
      slideCount: deck.slide_count,
      audience: deck.audience,
      theme: deck.theme,
    }),
  );
  try {
    await generateDeck({
      id,
      topic: deck.topic,
      locale: deck.locale,
      slideCount: deck.slide_count,
      audience: deck.audience,
      theme: sanitizePickerTheme(deck.theme),
      workDir,
      onThemeResolved: async (theme) => {
        await db.query(`UPDATE deck SET theme=$2, updated_at=now() WHERE id=$1`, [id, theme]);
        await writeFile(
          join(workDir, "input.json"),
          JSON.stringify({
            topic: deck.topic,
            locale: deck.locale,
            slideCount: deck.slide_count,
            audience: deck.audience,
            theme,
            requestedTheme: sanitizePickerTheme(deck.theme),
          }),
        );
      },
      onPreviewReady: async () => {
        await db.query(`UPDATE deck SET status='preview', updated_at=now() WHERE id=$1`, [id]);
      },
    });
    let researchUsed = false;
    try {
      const meta = JSON.parse(await readFile(join(workDir, "research-meta.json"), "utf8")) as {
        used?: boolean;
      };
      researchUsed = Boolean(meta.used);
    } catch {
      /* research-meta optional */
    }
    await writeFile(
      join(workDir, "meta.json"),
      JSON.stringify({
        outlineModel: config.outlineModel,
        composeModel: config.composeModel,
        researchUsed,
      }),
    );
    await db.query(`UPDATE deck SET status='ready', updated_at=now() WHERE id=$1`, [id]);
  } catch (err) {
    await db.query(
      `UPDATE deck SET status=$2, error=$3, updated_at=now() WHERE id=$1`,
      [id, finalAttempt ? "failed" : "queued", String(err)],
    );
    if (finalAttempt) {
      try {
        await finalizeDeckBilling(id, "failed");
      } catch (billingError) {
        billingLog("error", "finalize_failed", { deckId: id, outcome: "failed" }, billingError);
      }
    }
    throw err;
  }
  try {
    await finalizeDeckBilling(id, "ready");
  } catch (err) {
    billingLog("error", "finalize_failed", { deckId: id, outcome: "ready" }, err);
  }
}

export async function processRewriteSlide(
  id: string,
  slide: number,
  instruction: string,
): Promise<void> {
  const workDir = join(config.deckDataDir, id);
  try {
    await rewriteSlide({ id, workDir, slideIndex: slide, instruction });
  } catch (err) {
    await writeRewriteStatus(workDir, {
      slide,
      status: "failed",
      error: String(err).slice(0, 2000),
      instruction,
      updatedAt: new Date().toISOString(),
    });
    throw err;
  }
}

export async function enqueueDeck(id: string): Promise<void> {
  try {
    const q = startDeckWorker();
    if (q) {
      await q.add("generate", { id }, { jobId: id, attempts: 2 });
      return;
    }
  } catch (err) {
    console.error("enqueue redis failed, inline", err);
  }
  void processDeck(id).catch((err) => console.error(err));
}

/** Enqueue single-slide rewrite. Caller must have written rewrite.json status=running. */
export async function enqueueRewriteSlide(opts: {
  id: string;
  slide: number;
  instruction: string;
}): Promise<void> {
  const jobId = `rewrite-${opts.id}`;
  try {
    const q = startDeckWorker();
    if (q) {
      await q.add(
        "rewrite-slide",
        { id: opts.id, slide: opts.slide, instruction: opts.instruction },
        { jobId, attempts: 1, removeOnComplete: true, removeOnFail: true },
      );
      return;
    }
  } catch (err) {
    console.error("enqueue rewrite redis failed, inline", err);
  }
  void processRewriteSlide(opts.id, opts.slide, opts.instruction).catch((err) =>
    console.error(err),
  );
}

export async function processStructureSlide(id: string, op: StructureOp): Promise<void> {
  const workDir = join(config.deckDataDir, id);
  const slideHint =
    op.op === "insert" ? op.after : op.op === "move" || op.op === "delete" ? op.viewIndex : 1;
  try {
    await applySlideStructure({
      id,
      workDir,
      op,
      onSlideCount: async (count) => {
        if (!pool) return;
        await pool.query(`UPDATE deck SET slide_count=$2, updated_at=now() WHERE id=$1`, [
          id,
          count,
        ]);
      },
    });
  } catch (err) {
    await writeRewriteStatus(workDir, {
      slide: slideHint,
      status: "failed",
      error: String(err).slice(0, 2000),
      instruction: `structure:${op.op}`,
      updatedAt: new Date().toISOString(),
    });
    throw err;
  }
}

/** Enqueue structural slide edit. Caller must have written rewrite.json status=running. */
export async function enqueueStructureSlide(opts: {
  id: string;
  op: StructureOp;
}): Promise<void> {
  const jobId = `structure-${opts.id}`;
  try {
    const q = startDeckWorker();
    if (q) {
      await q.add(
        "structure-slide",
        { id: opts.id, op: opts.op },
        { jobId, attempts: 1, removeOnComplete: true, removeOnFail: true },
      );
      return;
    }
  } catch (err) {
    console.error("enqueue structure redis failed, inline", err);
  }
  void processStructureSlide(opts.id, opts.op).catch((err) => console.error(err));
}

export async function deckBusyForRewrite(id: string): Promise<"generating" | "rewriting" | null> {
  if (pool) {
    const { rows } = await pool.query<{ status: string }>(`SELECT status FROM deck WHERE id=$1`, [
      id,
    ]);
    const status = rows[0]?.status;
    if (status === "queued" || status === "generating" || status === "preview") {
      return "generating";
    }
  }
  const workDir = join(config.deckDataDir, id);
  const rewrite = await readRewriteStatus(workDir);
  if (isRewriteBuilding(rewrite)) return "rewriting";
  return null;
}
