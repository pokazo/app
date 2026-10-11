#!/usr/bin/env node
/**
 * Stdio MCP: search user-uploaded images for a deck.
 * Env: UPLOAD_IMAGES_DIR — absolute path to UPLOAD_DATA_DIR/{deckId}
 * Run: pnpm --filter @pokazo/api exec tsx src/upload-images-mcp-server.ts
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { uploadImageList, uploadImageSearch } from "./upload-images-catalog.js";

const uploadDir = (process.env.UPLOAD_IMAGES_DIR || "").trim();

const server = new McpServer({
  name: "pokazo-upload-images",
  version: "1.0.0",
});

server.registerTool(
  "upload-image-list",
  {
    description:
      "List user-uploaded images for this deck (id, filename, originalName, caption). Prefer upload-image-search with the slide imageQuery first.",
    inputSchema: {
      _: z.string().describe("Unused; pass empty string"),
    },
  },
  async () => {
    if (!uploadDir) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "UPLOAD_IMAGES_DIR not set" }],
      };
    }
    const rows = await uploadImageList(uploadDir);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
    };
  },
);

server.registerTool(
  "upload-image-search",
  {
    description:
      "FIRST photo search when the user attached images. Query from imageQuery (Russian/natural OK). Returns hits with captions + suggestedId. Prefer originalName over vague captions. If suggestedId is set, IMMEDIATELY call upload-image-use with that id — do not fall through to yandex/stock first. Only if this tool errors or hits are empty → yandex-image-search.",
    inputSchema: {
      query: z.string().describe("Natural image search query from outline imageQuery"),
      count: z.number().describe("Max hits 1–10; use 5 if unsure"),
    },
  },
  async ({ query, count }) => {
    if (!uploadDir) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "UPLOAD_IMAGES_DIR not set" }],
      };
    }
    const result = await uploadImageSearch(uploadDir, query, count > 0 ? count : 5);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

async function main() {
  if (!uploadDir) {
    console.error("UPLOAD_IMAGES_DIR is required");
    process.exit(1);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
