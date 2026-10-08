import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./env.js";
import { pool } from "./migrate.js";
import { generateDeck } from "./generate.js";
import { sanitizePickerTheme } from "./themes.js";

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
      new Worker("decks", (job) => processDeck(String(job.data.id)), {
        connection: redis(),
        concurrency: 1,
      });
    }
    return queue;
  } catch (err) {
    console.error("redis worker", err);
    return null;
  }
}

export async function processDeck(id: string): Promise<void> {
  if (!pool) throw new Error("no db");
  await pool.query(`UPDATE deck SET status='generating', updated_at=now() WHERE id=$1`, [id]);
  const { rows } = await pool.query(`SELECT * FROM deck WHERE id=$1`, [id]);
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
      onPreviewReady: async () => {
        await pool.query(`UPDATE deck SET status='preview', updated_at=now() WHERE id=$1`, [id]);
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
    await pool.query(`UPDATE deck SET status='ready', updated_at=now() WHERE id=$1`, [id]);
  } catch (err) {
    await pool.query(`UPDATE deck SET status='failed', error=$2, updated_at=now() WHERE id=$1`, [
      id,
      String(err),
    ]);
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
