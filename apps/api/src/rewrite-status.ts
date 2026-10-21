import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type RewriteStatus = {
  slide: number;
  status: "running" | "done" | "failed";
  error?: string;
  instruction?: string;
  updatedAt: string;
};

/** Crashed edit workers leave rewrite.json at status=running; ignore after this age. */
export const REWRITE_RUNNING_MAX_AGE_MS = 10 * 60 * 1000;

export function rewriteStatusPath(workDir: string): string {
  return join(workDir, "rewrite.json");
}

export async function readRewriteStatus(workDir: string): Promise<RewriteStatus | null> {
  try {
    const raw = JSON.parse(await readFile(rewriteStatusPath(workDir), "utf8")) as RewriteStatus;
    if (!raw || typeof raw.slide !== "number") return null;
    if (raw.status !== "running" && raw.status !== "done" && raw.status !== "failed") return null;
    return raw;
  } catch {
    return null;
  }
}

export async function writeRewriteStatus(workDir: string, status: RewriteStatus): Promise<void> {
  await writeFile(rewriteStatusPath(workDir), JSON.stringify(status, null, 2), "utf8");
}

/** True when running longer than REWRITE_RUNNING_MAX_AGE_MS (or updatedAt is unusable). */
export function isRewriteStatusStale(
  status: RewriteStatus,
  now: number = Date.now(),
): boolean {
  if (status.status !== "running") return false;
  const t = Date.parse(status.updatedAt);
  if (!Number.isFinite(t)) return true;
  return now - t > REWRITE_RUNNING_MAX_AGE_MS;
}

export function isRewriteBuilding(
  status: RewriteStatus | null | undefined,
  now: number = Date.now(),
): boolean {
  if (status?.status !== "running") return false;
  return !isRewriteStatusStale(status, now);
}

/** What /api/view should tell the player is in progress. */
export function viewEditKind(opts: {
  progressive: boolean;
  rewriting: boolean;
  instruction?: string | null;
}): "progressive" | "structure" | "rewrite" | null {
  if (opts.rewriting) {
    return (opts.instruction ?? "").startsWith("structure:") ? "structure" : "rewrite";
  }
  if (opts.progressive) return "progressive";
  return null;
}

/**
 * Persist failed for a stuck running rewrite so /api/view stops reporting building
 * and the owner can retry. No-op when fresh or already terminal.
 */
export async function expireStaleRewriteStatus(
  workDir: string,
  now: number = Date.now(),
): Promise<RewriteStatus | null> {
  const status = await readRewriteStatus(workDir);
  if (!status || status.status !== "running" || !isRewriteStatusStale(status, now)) {
    return status;
  }
  const started = Date.parse(status.updatedAt);
  const ageMs = Number.isFinite(started) ? now - started : null;
  const deckId = workDir.split(/[/\\]/).filter(Boolean).at(-1) ?? workDir;
  console.warn(
    `[edit] stale_rewrite_expired deck=${deckId} slide=${status.slide} ageMs=${ageMs ?? "unknown"} instruction=${JSON.stringify((status.instruction ?? "").slice(0, 120))}`,
  );
  const expired: RewriteStatus = {
    ...status,
    status: "failed",
    error: "Rewrite timed out — try again",
    updatedAt: new Date(now).toISOString(),
  };
  await writeRewriteStatus(workDir, expired);
  return expired;
}
