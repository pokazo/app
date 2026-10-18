import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./env.js";
import { formatAiError, logAiError } from "./format-ai-error.js";
import { pool } from "./migrate.js";
import { generateDeck } from "./generate.js";
import { rewriteSlide } from "./rewrite-slide.js";
import {
  expireStaleRewriteStatus,
  isRewriteBuilding,
  writeRewriteStatus,
} from "./rewrite-status.js";
import { WORKER_LOCK_DURATION_MS, bullWorkerOpts } from "./queue-worker-opts.js";
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
        `[queue] workers generate=${generateConcurrency} edits=${editConcurrency} lockMs=${WORKER_LOCK_DURATION_MS}`,
      );
      const attachWorkerLogs = (queueName: string, worker: Worker) => {
        worker.on("failed", (job, err) => {
          const data = (job?.data ?? {}) as {
            id?: string;
            slide?: number;
            op?: { op?: string };
          };
          console.error(
            `[edit] worker_job_failed queue=${queueName} job=${job?.name ?? "?"} jobId=${job?.id ?? "?"} deck=${data.id ?? "?"} slide=${data.slide ?? "-"} op=${data.op?.op ?? "-"} attempts=${job?.attemptsMade ?? 0} err=${formatAiError(err)}`,
          );
        });
        worker.on("error", (err) => {
          console.error(
            `[edit] worker_error queue=${queueName} err=${formatAiError(err)}`,
          );
        });
        worker.on("stalled", (jobId) => {
          console.warn(`[edit] worker_job_stalled queue=${queueName} jobId=${jobId}`);
        });
      };
      const generateWorker = new Worker(
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
          ...bullWorkerOpts(generateConcurrency),
        },
      );
      attachWorkerLogs("decks", generateWorker);
      const editWorker = new Worker(
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
          ...bullWorkerOpts(editConcurrency),
        },
      );
      attachWorkerLogs("deck-edits", editWorker);
    }
    return generateQueue;
  } catch (err) {
    console.error(`[edit] redis_worker_start_failed err=${formatAiError(err)}`);
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
  console.info(
    `[edit] rewrite_start deck=${id} slide=${slide} instruction=${JSON.stringify(instruction.slice(0, 120))}`,
  );
  try {
    await rewriteSlide({ id, workDir, slideIndex: slide, instruction });
    console.info(`[edit] rewrite_ok deck=${id} slide=${slide}`);
  } catch (err) {
    const detail = formatAiError(err);
    console.error(`[edit] rewrite_failed deck=${id} slide=${slide} err=${detail}`);
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
      console.info(`[edit] generate_enqueued deck=${id} via=redis`);
      return;
    }
  } catch (err) {
    console.error(
      `[edit] generate_enqueue_redis_failed deck=${id} fallback=inline err=${formatAiError(err)}`,
    );
  }
  console.warn(`[edit] generate_inline deck=${id}`);
  void processDeck(id).catch((err) => {
    console.error(`[edit] generate_inline_failed deck=${id} err=${formatAiError(err)}`);
  });
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
      console.info(
        `[edit] rewrite_enqueued deck=${opts.id} slide=${opts.slide} jobId=${jobId} via=redis`,
      );
      return;
    }
  } catch (err) {
    console.error(
      `[edit] rewrite_enqueue_redis_failed deck=${opts.id} slide=${opts.slide} jobId=${jobId} fallback=inline err=${formatAiError(err)}`,
    );
  }
  console.warn(`[edit] rewrite_inline deck=${opts.id} slide=${opts.slide}`);
  void processRewriteSlide(opts.id, opts.slide, opts.instruction).catch((err) => {
    console.error(
      `[edit] rewrite_inline_failed deck=${opts.id} slide=${opts.slide} err=${formatAiError(err)}`,
    );
  });
}

export async function processStructureSlide(id: string, op: StructureOp): Promise<void> {
  const workDir = join(config.deckDataDir, id);
  const slideHint =
    op.op === "insert" ? op.after : op.op === "move" ? op.to : op.op === "delete" ? op.viewIndex : 1;
  console.info(`[edit] structure_start deck=${id} op=${op.op} slide=${slideHint}`);
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
    console.info(`[edit] structure_ok deck=${id} op=${op.op} slide=${slideHint}`);
  } catch (err) {
    const detail = formatAiError(err);
    console.error(
      `[edit] structure_failed deck=${id} op=${op.op} slide=${slideHint} err=${detail}`,
    );
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
      console.info(
        `[edit] structure_enqueued deck=${opts.id} op=${opts.op.op} jobId=${jobId} via=redis`,
      );
      return;
    }
  } catch (err) {
    console.error(
      `[edit] structure_enqueue_redis_failed deck=${opts.id} op=${opts.op.op} jobId=${jobId} fallback=inline err=${formatAiError(err)}`,
    );
  }
  console.warn(`[edit] structure_inline deck=${opts.id} op=${opts.op.op}`);
  void processStructureSlide(opts.id, opts.op).catch((err) => {
    console.error(
      `[edit] structure_inline_failed deck=${opts.id} op=${opts.op.op} err=${formatAiError(err)}`,
    );
  });
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
  const rewrite = await expireStaleRewriteStatus(workDir);
  if (isRewriteBuilding(rewrite)) return "rewriting";
  return null;
}
