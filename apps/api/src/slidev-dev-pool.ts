/**
 * Tiny LRU pool of long-lived `slidev` (Vite) dev servers.
 * Edit path: write slides.md → HMR. Production `slidev build` stays for share/export.
 *
 * Enable: SLIDEV_DEV_POOL=true and SLIDEV_DEV_POOL_MAX (default 2).
 */
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "./env.js";
import {
  deckServeBase,
  ensureDeckNodeModules,
  ensureDeckViteConfig,
  installDeckLayouts,
  slidevBin,
} from "./slidev.js";

export type SlidevDevSession = {
  deckId: string;
  workDir: string;
  port: number;
  child: ChildProcess;
  lastUsedAt: number;
  ready: boolean;
};

const LIVE_DIRTY = ".live-dirty";

let sessions = new Map<string, SlidevDevSession>();
let starting = new Map<string, Promise<SlidevDevSession>>();

export function slidevDevPoolEnabled(): boolean {
  return config.slidevDevPoolMax > 0;
}

export function isSlidevDevLive(deckId: string): boolean {
  const s = sessions.get(deckId);
  return Boolean(s?.ready && s.child.exitCode === null);
}

export function getSlidevDevSession(deckId: string): SlidevDevSession | undefined {
  const s = sessions.get(deckId);
  if (!s?.ready || s.child.exitCode !== null) return undefined;
  s.lastUsedAt = Date.now();
  return s;
}

export async function markLiveDirty(workDir: string): Promise<void> {
  await writeFile(join(workDir, LIVE_DIRTY), `${Date.now()}\n`, "utf8");
}

export function isLiveDirty(workDir: string): boolean {
  return existsSync(join(workDir, LIVE_DIRTY));
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close();
        reject(new Error("no port"));
        return;
      }
      const port = addr.port;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
    srv.on("error", reject);
  });
}

function waitReady(child: ChildProcess, port: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let buf = "";
    const t0 = Date.now();
    const onData = (chunk: Buffer | string) => {
      buf += String(chunk);
      if (
        buf.includes(`localhost:${port}`) ||
        buf.includes(`127.0.0.1:${port}`) ||
        /public slide show/i.test(buf)
      ) {
        cleanup();
        resolve();
      } else if (Date.now() - t0 > timeoutMs) {
        cleanup();
        reject(new Error("slidev dev ready timeout"));
      }
    };
    const onExit = (code: number | null) => {
      cleanup();
      reject(new Error(`slidev dev exited early code=${code}`));
    };
    const timer = setInterval(() => {
      if (Date.now() - t0 > timeoutMs) {
        cleanup();
        reject(new Error("slidev dev ready timeout"));
      }
    }, 500);
    const cleanup = () => {
      clearInterval(timer);
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off("exit", onExit);
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", onExit);
  });
}

async function killSession(s: SlidevDevSession): Promise<void> {
  sessions.delete(s.deckId);
  const child = s.child;
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 4000);
    child.once("exit", () => {
      clearTimeout(t);
      resolve();
    });
  });
  console.info(`[slidev-dev] stopped deck=${s.deckId} port=${s.port}`);
}

async function evictLruIfNeeded(): Promise<void> {
  const max = config.slidevDevPoolMax;
  while (sessions.size >= max) {
    let oldest: SlidevDevSession | undefined;
    for (const s of sessions.values()) {
      if (!oldest || s.lastUsedAt < oldest.lastUsedAt) oldest = s;
    }
    if (!oldest) break;
    await killSession(oldest);
  }
}

async function spawnSession(deckId: string, workDir: string): Promise<SlidevDevSession> {
  if (!existsSync(join(workDir, "slides.md"))) {
    throw new Error("no slides.md");
  }
  await evictLruIfNeeded();
  ensureDeckNodeModules(workDir);
  installDeckLayouts(workDir);
  await ensureDeckViteConfig(workDir);

  const port = await freePort();
  const base = deckServeBase(deckId);
  const bin = slidevBin();
  const child = spawn(
    bin,
    ["slides.md", "--port", String(port), "--bind", "127.0.0.1", "--base", base],
    {
      cwd: workDir,
      env: { ...process.env, CI: "1", BROWSER: "none" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const session: SlidevDevSession = {
    deckId,
    workDir,
    port,
    child,
    lastUsedAt: Date.now(),
    ready: false,
  };
  sessions.set(deckId, session);

  child.on("exit", (code, signal) => {
    console.info(`[slidev-dev] exit deck=${deckId} code=${code} signal=${signal}`);
    if (sessions.get(deckId) === session) sessions.delete(deckId);
  });

  const t0 = Date.now();
  try {
    await waitReady(child, port, 60_000);
    session.ready = true;
    session.lastUsedAt = Date.now();
    console.info(`[slidev-dev] ready deck=${deckId} port=${port} ms=${Date.now() - t0}`);
    return session;
  } catch (err) {
    await killSession(session);
    throw err;
  }
}

/** Ensure a live Slidev for this deck (owner edit path). */
export async function ensureSlidevDev(deckId: string, workDir: string): Promise<SlidevDevSession> {
  if (!slidevDevPoolEnabled()) {
    throw new Error("slidev dev pool disabled");
  }
  const existing = getSlidevDevSession(deckId);
  if (existing) return existing;

  const inflight = starting.get(deckId);
  if (inflight) return inflight;

  const p = spawnSession(deckId, workDir).finally(() => {
    starting.delete(deckId);
  });
  starting.set(deckId, p);
  return p;
}

export async function stopSlidevDev(deckId: string): Promise<void> {
  const s = sessions.get(deckId);
  if (s) await killSession(s);
}

/** Touch + optional idle sweep (call from interval). */
export async function sweepSlidevDevIdle(now = Date.now()): Promise<number> {
  const ttl = config.slidevDevPoolIdleMs;
  let n = 0;
  for (const s of [...sessions.values()]) {
    if (now - s.lastUsedAt > ttl) {
      await killSession(s);
      n++;
    }
  }
  return n;
}

/** Test helper — replace session map. */
export function _resetSlidevDevPoolForTests(): void {
  for (const s of sessions.values()) {
    try {
      s.child.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }
  sessions = new Map();
  starting = new Map();
}

export function _slidevDevPoolSizeForTests(): number {
  return sessions.size;
}
