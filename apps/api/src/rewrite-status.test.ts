import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  REWRITE_RUNNING_MAX_AGE_MS,
  expireStaleRewriteStatus,
  isRewriteBuilding,
  isRewriteStatusStale,
  readRewriteStatus,
  writeRewriteStatus,
} from "./rewrite-status.js";

describe("rewrite-status", () => {
  it("round-trips running status", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-rewrite-"));
    await writeRewriteStatus(dir, {
      slide: 3,
      status: "running",
      instruction: "короче",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const raw = await readFile(join(dir, "rewrite.json"), "utf8");
    expect(raw).toMatch(/"status": "running"/);
    const status = await readRewriteStatus(dir);
    expect(status?.slide).toBe(3);
    expect(isRewriteBuilding(status, Date.parse("2026-01-01T00:00:00.000Z"))).toBe(true);
  });

  it("building only while running and fresh", () => {
    const now = Date.parse("2026-06-01T12:00:00.000Z");
    expect(
      isRewriteBuilding(
        { slide: 1, status: "running", updatedAt: "2026-06-01T11:55:00.000Z" },
        now,
      ),
    ).toBe(true);
    expect(isRewriteBuilding({ slide: 1, status: "done", updatedAt: "" })).toBe(false);
    expect(isRewriteBuilding({ slide: 1, status: "failed", updatedAt: "" })).toBe(false);
    expect(isRewriteBuilding(null)).toBe(false);
  });

  it("treats old running status as stale / not building", () => {
    const started = Date.parse("2026-06-01T10:00:00.000Z");
    const now = started + REWRITE_RUNNING_MAX_AGE_MS + 1;
    const status = {
      slide: 2,
      status: "running" as const,
      updatedAt: new Date(started).toISOString(),
    };
    expect(isRewriteStatusStale(status, now)).toBe(true);
    expect(isRewriteBuilding(status, now)).toBe(false);
  });

  it("expires stale running rewrite to failed", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-rewrite-expire-"));
    const started = Date.parse("2026-06-01T10:00:00.000Z");
    const now = started + REWRITE_RUNNING_MAX_AGE_MS + 5_000;
    await writeRewriteStatus(dir, {
      slide: 4,
      status: "running",
      instruction: "пересобери",
      updatedAt: new Date(started).toISOString(),
    });
    const expired = await expireStaleRewriteStatus(dir, now);
    expect(expired?.status).toBe("failed");
    expect(expired?.error).toMatch(/timed out/i);
    const onDisk = await readRewriteStatus(dir);
    expect(onDisk?.status).toBe("failed");
  });

  it("does not expire a fresh running rewrite", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-rewrite-fresh-"));
    const now = Date.parse("2026-06-01T12:00:00.000Z");
    await writeRewriteStatus(dir, {
      slide: 1,
      status: "running",
      updatedAt: new Date(now - 60_000).toISOString(),
    });
    const kept = await expireStaleRewriteStatus(dir, now);
    expect(kept?.status).toBe("running");
  });
});
