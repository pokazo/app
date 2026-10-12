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
      "List Pokazo hero variants. Each row has summary, whenToUse, needs, and fields[] — the exact frontmatter/body props the hero Vue block expects (name, required, in, type, expects, limit). Call BEFORE choosing a variant.",
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
      "Full hero variant contract. Read fields[] carefully before slidev-update-slide: layout=hero, variant=<id>, image (local path, required), optional brand/kicker/source; body = H1 + 1–2 sentence promise (no bullets). Also returns whenToUse, antiPatterns, needs, frontmatter, body, displays.",
    inputSchema: {
      id: z
        .string()
        .describe("Hero variant id: ribbon|corner|inset|fullbleed|product"),
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
