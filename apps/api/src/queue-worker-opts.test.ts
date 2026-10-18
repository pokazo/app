import { describe, expect, it } from "vitest";
import {
  WORKER_LOCK_DURATION_MS,
  WORKER_STALLED_INTERVAL_MS,
  bullWorkerOpts,
} from "./queue-worker-opts.js";

describe("bullWorkerOpts", () => {
  it("uses a multi-minute lock so LLM generate/rewrite do not stall at BullMQ's 30s default", () => {
    expect(WORKER_LOCK_DURATION_MS).toBeGreaterThanOrEqual(10 * 60 * 1000);
    expect(WORKER_STALLED_INTERVAL_MS).toBeLessThanOrEqual(WORKER_LOCK_DURATION_MS);
    expect(bullWorkerOpts(4)).toMatchObject({
      concurrency: 4,
      lockDuration: WORKER_LOCK_DURATION_MS,
      stalledInterval: WORKER_STALLED_INTERVAL_MS,
      maxStalledCount: 2,
    });
  });
});
