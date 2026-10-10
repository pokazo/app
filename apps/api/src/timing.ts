/** Lightweight wall-clock helpers for generate pipeline logs. */

export type PhaseTimer = {
  mark: (name: string) => void;
  msSince: (name: string) => number | null;
  summary: () => Record<string, number>;
};

export function createPhaseTimer(label = "generate"): PhaseTimer {
  const t0 = Date.now();
  const marks = new Map<string, number>([["start", t0]]);
  let last = t0;
  return {
    mark(name: string) {
      const now = Date.now();
      const delta = now - last;
      marks.set(name, now);
      console.info(`[timing] ${label} +${delta}ms total=${now - t0}ms @${name}`);
      last = now;
    },
    msSince(name: string) {
      const at = marks.get(name);
      if (at == null) return null;
      return Date.now() - at;
    },
    summary() {
      const out: Record<string, number> = { totalMs: Date.now() - t0 };
      const order = [...marks.keys()];
      for (let i = 1; i < order.length; i++) {
        const prev = order[i - 1]!;
        const cur = order[i]!;
        out[`${prev}->${cur}`] = marks.get(cur)! - marks.get(prev)!;
      }
      return out;
    },
  };
}

export async function timedTool<T>(
  name: string,
  run: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> {
  const t0 = Date.now();
  try {
    const result = await run();
    const ms = Date.now() - t0;
    const extra = meta ? ` ${JSON.stringify(meta)}` : "";
    let hint = "";
    if (result && typeof result === "object") {
      const r = result as {
        error?: unknown;
        hits?: unknown[];
        suggestedId?: string;
        path?: string;
      };
      if (Array.isArray(result)) hint = ` hits=${result.length}`;
      else if (Array.isArray(r.hits)) {
        hint = ` hits=${r.hits.length}${r.suggestedId ? ` suggestedId=${r.suggestedId}` : ""}`;
      } else if ("error" in r && r.error) hint = ` error=${String(r.error).slice(0, 120)}`;
      else if (r.path) hint = ` path=${r.path}`;
    }
    console.info(`[tool] ok ${name} ${ms}ms${hint}${extra}`);
    return result;
  } catch (err) {
    const ms = Date.now() - t0;
    console.info(`[tool] fail ${name} ${ms}ms ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}
