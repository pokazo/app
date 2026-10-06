import { experimental_createMCPClient } from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
import { ensureDeckNodeModules, slidevMcpSpawnSpec } from "./slidev.js";

const COMPOSE_TOOL_ALLOW = new Set([
  "slidev-get-info",
  "slidev-list-slides",
  "slidev-get-slide",
  "slidev-update-slide",
  "slidev-insert-slide",
  "slidev-remove-slide",
  "slidev-move-slide",
]);

export type McpCallLog = {
  name: string;
  args: unknown;
  ok: boolean;
  ms: number;
  result?: unknown;
  error?: string;
};

type ExecutableTool = {
  execute?: (args: unknown, options: unknown) => Promise<unknown>;
};

function preview(value: unknown, max = 800): unknown {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  if (raw == null) return value;
  return raw.length > max ? `${raw.slice(0, max)}…` : value;
}

export function pickComposeTools<T extends Record<string, unknown>>(tools: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (COMPOSE_TOOL_ALLOW.has(name)) {
      out[name as keyof T] = tool as T[keyof T];
    }
  }
  return out;
}

export function wrapComposeTools(
  tools: Record<string, unknown>,
  onCall: (entry: McpCallLog) => void,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, raw] of Object.entries(tools)) {
    const tool = raw as ExecutableTool;
    if (typeof tool.execute !== "function") {
      out[name] = raw;
      continue;
    }
    const execute = tool.execute.bind(tool);
    out[name] = {
      ...tool,
      execute: async (args: unknown, options: unknown) => {
        const started = Date.now();
        try {
          const result = await execute(args, options);
          const failed = Boolean(
            result && typeof result === "object" && "isError" in result && (result as { isError?: boolean }).isError,
          );
          onCall({
            name,
            args: preview(args),
            ok: !failed,
            ms: Date.now() - started,
            result: preview(result),
          });
          return result;
        } catch (err) {
          onCall({
            name,
            args: preview(args),
            ok: false,
            ms: Date.now() - started,
            error: String(err),
          });
          throw err;
        }
      },
    };
  }
  return out;
}

export async function withSlidevMcp<T>(
  workDir: string,
  run: (tools: Record<string, unknown>) => Promise<T>,
  onCall?: (entry: McpCallLog) => void,
): Promise<T> {
  ensureDeckNodeModules(workDir);
  const spec = slidevMcpSpawnSpec(workDir);
  const transport = new Experimental_StdioMCPTransport({
    command: spec.bin,
    args: spec.args,
    cwd: spec.cwd,
    stderr: "pipe",
  });
  const client = await experimental_createMCPClient({
    name: "pokazo-compose",
    transport,
  });
  try {
    const tools = wrapComposeTools(pickComposeTools(await client.tools()) as Record<string, unknown>, (entry) => {
      console.info(
        `[mcp] ${entry.ok ? "ok" : "fail"} ${entry.name} ${entry.ms}ms`,
        entry.ok ? "" : entry.error,
      );
      onCall?.(entry);
    });
    return await run(tools);
  } finally {
    await client.close();
  }
}
