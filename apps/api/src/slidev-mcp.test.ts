import { describe, expect, it } from "vitest";
import { pickComposeTools, wrapComposeTools, type McpCallLog } from "./slidev-mcp.js";

describe("pickComposeTools", () => {
  it("keeps deck mutation tools and drops live navigation", () => {
    const tools = {
      "slidev-get-info": { ok: 1 },
      "slidev-list-slides": { ok: 1 },
      "slidev-update-slide": { ok: 1 },
      "slidev-insert-slide": { ok: 1 },
      "slidev-goto-slide": { ok: 1 },
      "other": { ok: 1 },
    };
    expect(Object.keys(pickComposeTools(tools)).sort()).toEqual([
      "slidev-get-info",
      "slidev-insert-slide",
      "slidev-list-slides",
      "slidev-update-slide",
    ]);
  });
});

describe("wrapComposeTools", () => {
  it("records successful MCP execute calls", async () => {
    const log: McpCallLog[] = [];
    const wrapped = wrapComposeTools(
      {
        "slidev-list-slides": {
          execute: async (args: unknown) => ({ args, slides: 1 }),
        },
      },
      (entry) => log.push(entry),
    );
    const tool = wrapped["slidev-list-slides"] as {
      execute: (args: unknown, options: unknown) => Promise<unknown>;
    };
    await tool.execute({ no: 1 }, {});
    expect(log).toHaveLength(1);
    expect(log[0]?.name).toBe("slidev-list-slides");
    expect(log[0]?.ok).toBe(true);
  });

  it("marks MCP isError results as failed", async () => {
    const log: McpCallLog[] = [];
    const wrapped = wrapComposeTools(
      {
        "slidev-insert-slide": {
          execute: async () => ({ isError: true, content: [{ type: "text", text: "no slide" }] }),
        },
      },
      (entry) => log.push(entry),
    );
    const tool = wrapped["slidev-insert-slide"] as {
      execute: (args: unknown, options: unknown) => Promise<unknown>;
    };
    await tool.execute({}, {});
    expect(log[0]?.ok).toBe(false);
  });
});
