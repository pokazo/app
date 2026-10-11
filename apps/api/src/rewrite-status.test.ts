import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isRewriteBuilding, readRewriteStatus, writeRewriteStatus } from "./rewrite-status.js";

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
    expect(isRewriteBuilding(status)).toBe(true);
  });

  it("building only while running", () => {
    expect(isRewriteBuilding({ slide: 1, status: "done", updatedAt: "" })).toBe(false);
    expect(isRewriteBuilding({ slide: 1, status: "failed", updatedAt: "" })).toBe(false);
    expect(isRewriteBuilding(null)).toBe(false);
  });
});
