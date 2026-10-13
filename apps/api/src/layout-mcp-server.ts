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
      "List Pokazo Slidev layouts with summary, whenToUse, and outlineFields. Pass tag to filter (photo, kpi, steps, features, voice, close, …) or empty string for all.",
    inputSchema: {
      // Required (no .optional/.default): OpenAI/Azure strict tools need every properties key in `required`.
      tag: z.string().describe("Tag filter; use empty string for all layouts"),
    },
  },
  async ({ tag }) => {
    const rows = layoutList(tag.trim() || undefined);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
    };
  },
);

server.registerTool(
  "layout-get",
  {
    description:
      "Full layout contract: when to use, anti-patterns, outline fields, frontmatter/body, fields[] with soft limit, what it displays, example JSON. Read fields carefully; honor each fields[].limit or text clips in the half-pane.",
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
      // Required booleans/numbers (no .optional): OpenAI/Azure strict tool schemas.
      hasNumbers: z.boolean().describe("True if the slide is about metrics/KPIs"),
      hasSteps: z.boolean().describe("True if the slide is a sequence/pipeline"),
      wantsPhoto: z.boolean().describe("True if a photo layout is preferred"),
      featureCount: z.number().describe("Feature-like item count; 0 if unknown"),
    },
  },
  async (args) => {
    const hits = layoutMatch({
      intent: args.intent,
      hasNumbers: args.hasNumbers || undefined,
      hasSteps: args.hasSteps || undefined,
      wantsPhoto: args.wantsPhoto || undefined,
      featureCount: args.featureCount > 0 ? args.featureCount : undefined,
    });
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
