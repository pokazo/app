import { experimental_createMCPClient } from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { McpCallLog } from "./slidev-mcp.js";
import { wrapComposeTools } from "./slidev-mcp.js";

const HERO_CATALOG_TOOL_ALLOW = new Set(["hero-list", "hero-get"]);

function apiDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

export function heroMcpSpawnSpec(): { command: string; args: string[]; cwd: string } {
  const cwd = apiDir();
  return {
    command: join(cwd, "node_modules/.bin/tsx"),
    args: ["src/hero-mcp-server.ts"],
    cwd,
  };
}

export function pickHeroCatalogTools<T extends Record<string, unknown>>(tools: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (HERO_CATALOG_TOOL_ALLOW.has(name)) {
      out[name as keyof T] = tool as T[keyof T];
    }
  }
  return out;
}

function childEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value != null && !value.startsWith("()")) out[key] = value;
  }
  return out;
}

/** Hero-compose only. Outline/compose must not call this. */
export async function withHeroMcp<T>(
  run: (tools: Record<string, unknown>) => Promise<T>,
  onCall?: (entry: McpCallLog) => void,
): Promise<T> {
  const spec = heroMcpSpawnSpec();
  const transport = new Experimental_StdioMCPTransport({
    command: spec.command,
    args: spec.args,
    cwd: spec.cwd,
    env: childEnv(),
    stderr: "inherit",
  });
  const client = await experimental_createMCPClient({
    name: "pokazo-hero-catalog",
    transport,
  });
  try {
    const tools = wrapComposeTools(
      pickHeroCatalogTools(await client.tools()) as Record<string, unknown>,
      (entry) => {
        console.info(
          `[hero-mcp] ${entry.ok ? "ok" : "fail"} ${entry.name} ${entry.ms}ms`,
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
