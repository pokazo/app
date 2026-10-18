/**
 * BullMQ Worker lock settings.
 *
 * Source: `bullmq` Worker defaults (`lockDuration: 30_000`, `stalledInterval: 30_000`).
 * LLM generate/rewrite often run for minutes; under load the lock renew timer can miss
 * the 30s window → `worker_job_stalled` and a stuck `rewrite.json` running lock.
 */
export const WORKER_LOCK_DURATION_MS = 15 * 60 * 1000;
export const WORKER_STALLED_INTERVAL_MS = 60 * 1000;

export function bullWorkerOpts(concurrency: number) {
  return {
    concurrency,
    lockDuration: WORKER_LOCK_DURATION_MS,
    stalledInterval: WORKER_STALLED_INTERVAL_MS,
    maxStalledCount: 2,
  };
}
