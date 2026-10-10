import { experimental_createMCPClient } from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { McpCallLog } from "./slidev-mcp.js";
import { wrapComposeTools } from "./slidev-mcp.js";

const LAYOUT_TOOL_ALLOW = new Set(["layout-list", "layout-get", "layout-match"]);

function apiDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

export function layoutMcpSpawnSpec(): { command: string; args: string[]; cwd: string } {
  const cwd = apiDir();
  // Direct .bin/tsx — nested `pnpm exec` under another tsx often hangs on spawn.
  return {
    command: join(cwd, "node_modules/.bin/tsx"),
    args: ["src/layout-mcp-server.ts"],
    cwd,
  };
}

export function pickLayoutTools<T extends Record<string, unknown>>(tools: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (LAYOUT_TOOL_ALLOW.has(name)) {
      out[name as keyof T] = tool as T[keyof T];
    }
  }
  return out;
}

function childEnv(): Record<string, string> {
  // AI SDK stdio transport defaults to a tiny inherited-env whitelist; tsx/node
  // under pnpm need the real process env (PATH, NODE_*, pnpm vars) or handshake stalls.
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value != null && !value.startsWith("()")) out[key] = value;
  }
  return out;
}

export async function withLayoutMcp<T>(
  run: (tools: Record<string, unknown>) => Promise<T>,
  onCall?: (entry: McpCallLog) => void,
): Promise<T> {
  const spec = layoutMcpSpawnSpec();
  const transport = new Experimental_StdioMCPTransport({
    command: spec.command,
    args: spec.args,
    cwd: spec.cwd,
    env: childEnv(),
    stderr: "inherit",
  });
  const client = await experimental_createMCPClient({
    name: "pokazo-outline-layouts",
    transport,
  });
  try {
    const tools = wrapComposeTools(
      pickLayoutTools(await client.tools()) as Record<string, unknown>,
      (entry) => {
        console.info(
          `[layout-mcp] ${entry.ok ? "ok" : "fail"} ${entry.name} ${entry.ms}ms`,
          entry.ok ? "" : entry.error,
        );
        onCall?.(entry);
      },
    );
    return await run(tools);
  } finally {
    await client.close();
  }
}
