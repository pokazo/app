import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { withUploadImagesMcp } from "./upload-images-mcp.js";
import type { UploadIndex } from "./upload-index.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("upload-images MCP stdio", () => {
  it("lists and searches over stdio", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pokazo-upmcp-"));
    dirs.push(dir);
    const index: UploadIndex = {
      deckId: "d",
      files: [
        {
          id: "up-001",
          storedName: "up-001.jpg",
          originalName: "mountain.jpg",
          mime: "image/jpeg",
          caption: "Snowy mountain peak at sunrise",
          tokens: ["snowy", "mountain", "peak", "sunrise"],
        },
      ],
    };
    await writeFile(join(dir, "index.json"), JSON.stringify(index), "utf8");

    await withUploadImagesMcp(dir, async (tools) => {
      type ExecTool = { execute: (a: unknown, o: unknown) => Promise<unknown> };
      const list = tools["upload-image-list"] as ExecTool;
      const search = tools["upload-image-search"] as ExecTool;
      const listed = await list.execute({ _: "" }, {});
      const searched = await search.execute({ query: "mountain sunrise", count: 5 }, {});
      const listText = JSON.stringify(listed);
      const searchText = JSON.stringify(searched);
      expect(listText).toMatch(/up-001/);
      expect(searchText).toMatch(/suggestedId|up-001|mountain/i);
    });
  }, 20_000);
});
