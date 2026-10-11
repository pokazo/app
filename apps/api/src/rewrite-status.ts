import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type RewriteStatus = {
  slide: number;
  status: "running" | "done" | "failed";
  error?: string;
  instruction?: string;
  updatedAt: string;
};

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

export function isRewriteBuilding(status: RewriteStatus | null | undefined): boolean {
  return status?.status === "running";
}
