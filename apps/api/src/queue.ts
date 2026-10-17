import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./env.js";
import { formatAiError, logAiError } from "./format-ai-error.js";
import { pool } from "./migrate.js";
import { generateDeck } from "./generate.js";
import { rewriteSlide } from "./rewrite-slide.js";
import { isRewriteBuilding, readRewriteStatus, writeRewriteStatus } from "./rewrite-status.js";
import { applySlideStructure, type StructureOp } from "./slide-structure.js";
import { sanitizePickerTheme } from "./themes.js";
import { billingLog, finalizeDeckBilling } from "./billing.js";

let generateQueue: Queue | null = null;
let editQueue: Queue | null = null;
let workersStarted = false;

function redis() {
  return new Redis(config.redisUrl, { maxRetriesPerRequest: null });
}

/**
 * Generate and edit run on separate BullMQ queues so compose load cannot starve
 * filmstrip delete/move/insert or single-slide rewrite.
 * Many generates run in parallel (`DECK_GENERATE_CONCURRENCY`, default 8).
 * The generate worker still accepts legacy rewrite/structure job names that
 * were already waiting on `decks` before the split.
 */
export function startDeckWorker(): Queue | null {
  if (!config.redisUrl) return null;
  try {
    if (!generateQueue) generateQueue = new Queue("decks", { connection: redis() });
    if (!editQueue) editQueue = new Queue("deck-edits", { connection: redis() });
    if (!workersStarted) {
      workersStarted = true;
      const generateConcurrency = config.deckGenerateConcurrency;
      const editConcurrency = config.deckEditConcurrency;
      console.info(
        `[queue] workers generate=${generateConcurrency} edits=${editConcurrency}`,
      );
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
          concurrency: generateConcurrency,
        },
      );
      new Worker(
        "deck-edits",
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
          throw new Error(`unknown deck-edits job: ${job.name}`);
        },
        {
          connection: redis(),
          concurrency: editConcurrency,
        },
      );
    }
    return generateQueue;
  } catch (err) {
    console.error("redis worker", err);
    return null;
  }
}

function startEditQueue(): Queue | null {
  const gen = startDeckWorker();
  if (!gen) return null;
  return editQueue;
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
    const detail = formatAiError(err);
    logAiError("generate", err, { deckId: id, finalAttempt });
    await db.query(
      `UPDATE deck SET status=$2, error=$3, updated_at=now() WHERE id=$1`,
      [id, finalAttempt ? "failed" : "queued", detail],
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
    const detail = formatAiError(err);
    logAiError("rewrite", err, { deckId: id, slide });
    await writeRewriteStatus(workDir, {
      slide,
      status: "failed",
      error: detail,
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
    const q = startEditQueue();
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
    op.op === "insert" ? op.after : op.op === "move" ? op.to : op.op === "delete" ? op.viewIndex : 1;
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
    const detail = formatAiError(err);
    logAiError("structure", err, { deckId: id, op: op.op });
    await writeRewriteStatus(workDir, {
      slide: slideHint,
      status: "failed",
      error: detail,
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
    const q = startEditQueue();
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
