#!/usr/bin/env node
/**
 * Stdio MCP: hero variant catalog for the hero-compose agent only.
 * Run: pnpm --filter @pokazo/api exec tsx src/hero-mcp-server.ts
 *
 * Do not wire this into outline/compose — they must not see these tools.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { heroGet, heroList } from "./hero-catalog.js";

const server = new McpServer({
  name: "pokazo-hero",
  version: "1.0.0",
});

server.registerTool(
  "hero-list",
  {
    description:
      "List Pokazo hero variants with summary, whenToUse, and needs (what data each variant requires). Call before choosing variant.",
    inputSchema: {
      // Empty object — OpenAI strict tools still need a defined schema.
      _: z.string().describe("Unused; pass empty string"),
    },
  },
  async () => {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(heroList(), null, 2) }],
    };
  },
);

server.registerTool(
  "hero-get",
  {
    description:
      "Full hero variant contract: when to use, anti-patterns, needs, frontmatter/body, what it displays.",
    inputSchema: {
      id: z
        .string()
        .describe("Hero variant id: ribbon|corner|inset|fullbleed|editorial|product"),
    },
  },
  async ({ id }) => {
    try {
      const entry = heroGet(id);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(entry, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: String(err) }],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
