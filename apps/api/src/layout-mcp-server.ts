#!/usr/bin/env node
/**
 * Stdio MCP: layout catalog for outline/compose selection.
 * Run: pnpm --filter @pokazo/api exec tsx src/layout-mcp-server.ts
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { layoutGet, layoutList, layoutMatch } from "./layout-catalog.js";

const server = new McpServer({
  name: "pokazo-layouts",
  version: "1.0.0",
});

server.registerTool(
  "layout-list",
  {
    description:
      "List Pokazo Slidev layouts with summary, whenToUse, and outlineFields. Optional tag filter (photo, kpi, steps, features, voice, close, …).",
    inputSchema: {
      tag: z.string().optional().describe("Optional tag filter"),
    },
  },
  async ({ tag }) => {
    const rows = layoutList(tag);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
    };
  },
);

server.registerTool(
  "layout-get",
  {
    description:
      "Full layout contract: when to use, anti-patterns, outline fields, frontmatter/body, what it displays, example JSON.",
    inputSchema: {
      id: z.string().describe("Layout id, e.g. features, process, fact"),
    },
  },
  async ({ id }) => {
    try {
      const entry = layoutGet(id);
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

server.registerTool(
  "layout-match",
  {
    description:
      "Rank layout candidates for a slide intent. Returns top ids with scores/reasons — pick one and fill its outlineFields (use layout-get for details).",
    inputSchema: {
      intent: z.string().describe("Slide intent / what the slide should communicate"),
      hasNumbers: z.boolean().optional(),
      hasSteps: z.boolean().optional(),
      wantsPhoto: z.boolean().optional(),
      featureCount: z.number().optional().describe("How many feature-like items if any"),
    },
  },
  async (args) => {
    const hits = layoutMatch(args);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(hits, null, 2) }],
    };
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
