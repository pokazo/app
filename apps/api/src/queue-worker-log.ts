const DECK_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extract deck id from BullMQ jobId (`rewrite-{uuid}`, `structure-{uuid}`, or bare uuid). */
export function deckFromJobId(jobId: string | undefined | null): string | null {
  if (!jobId) return null;
  if (DECK_UUID.test(jobId)) return jobId;
  for (const prefix of ["rewrite-", "structure-"] as const) {
    if (jobId.startsWith(prefix)) {
      const rest = jobId.slice(prefix.length);
      if (DECK_UUID.test(rest)) return rest;
    }
  }
  return null;
}

export function summarizeJobData(data: unknown): {
  deck: string;
  slide: string;
  op: string;
} {
  const d = (data ?? {}) as {
    id?: string;
    slide?: number;
    op?: { op?: string };
  };
  return {
    deck: typeof d.id === "string" && d.id ? d.id : "-",
    slide: typeof d.slide === "number" ? String(d.slide) : "-",
    op: typeof d.op?.op === "string" && d.op.op ? d.op.op : "-",
  };
}

export function jobDurationMs(job: {
  processedOn?: number | null;
  finishedOn?: number | null;
}): number | null {
  if (job.processedOn == null || job.finishedOn == null) return null;
  const ms = job.finishedOn - job.processedOn;
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

export type WorkerJobLogEvent = "active" | "completed" | "failed" | "stalled";

export function formatWorkerJobLine(
  event: WorkerJobLogEvent,
  queueName: string,
  job: {
    name?: string | null;
    id?: string | null;
    data?: unknown;
    attemptsMade?: number | null;
    processedOn?: number | null;
    finishedOn?: number | null;
  },
  err?: string,
): string {
  const fromData = summarizeJobData(job.data);
  const deck =
    fromData.deck !== "-" ? fromData.deck : deckFromJobId(job.id ?? undefined) ?? "-";
  const duration = jobDurationMs(job);
  const parts = [
    `[queue] worker_job_${event}`,
    `queue=${queueName}`,
    `job=${job.name ?? "?"}`,
    `jobId=${job.id ?? "?"}`,
    `deck=${deck}`,
    `slide=${fromData.slide}`,
    `op=${fromData.op}`,
    `attempts=${job.attemptsMade != null ? job.attemptsMade : "-"}`,
  ];
  if (duration != null) parts.push(`durationMs=${duration}`);
  if (err) parts.push(`err=${err}`);
  return parts.join(" ");
}
