import { experimental_createMCPClient } from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { McpCallLog } from "./slidev-mcp.js";
import { wrapComposeTools } from "./slidev-mcp.js";

const UPLOAD_TOOL_ALLOW = new Set(["upload-image-list", "upload-image-search"]);

function apiDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

export function uploadImagesMcpSpawnSpec(): { command: string; args: string[]; cwd: string } {
  const cwd = apiDir();
  return {
    command: join(cwd, "node_modules/.bin/tsx"),
    args: ["src/upload-images-mcp-server.ts"],
    cwd,
  };
}

export function pickUploadImagesTools<T extends Record<string, unknown>>(tools: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [name, tool] of Object.entries(tools)) {
    if (UPLOAD_TOOL_ALLOW.has(name)) {
      out[name as keyof T] = tool as T[keyof T];
    }
  }
  return out;
}

function childEnv(uploadDir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value != null && !value.startsWith("()")) out[key] = value;
  }
  out.UPLOAD_IMAGES_DIR = uploadDir;
  return out;
}

export async function withUploadImagesMcp<T>(
  uploadDir: string,
  run: (tools: Record<string, unknown>) => Promise<T>,
  onCall?: (entry: McpCallLog) => void,
): Promise<T> {
  const spec = uploadImagesMcpSpawnSpec();
  const transport = new Experimental_StdioMCPTransport({
    command: spec.command,
    args: spec.args,
    cwd: spec.cwd,
    env: childEnv(uploadDir),
    stderr: "inherit",
  });
  const client = await experimental_createMCPClient({
    name: "pokazo-upload-images",
    transport,
  });
  try {
    const tools = wrapComposeTools(
      pickUploadImagesTools(await client.tools()) as Record<string, unknown>,
      (entry) => {
        console.info(
          `[upload-images-mcp] ${entry.ok ? "ok" : "fail"} ${entry.name} ${entry.ms}ms`,
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
