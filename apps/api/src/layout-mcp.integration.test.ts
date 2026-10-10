import { describe, expect, it } from "vitest";
import { layoutMcpSpawnSpec, withLayoutMcp } from "./layout-mcp.js";

type ExecTool = { execute: (a: unknown, o: unknown) => Promise<unknown> };

describe("layout MCP stdio", () => {
  it("spawns with local tsx binary", () => {
    const spec = layoutMcpSpawnSpec();
    expect(spec.command).toMatch(/tsx$/);
    expect(spec.args).toEqual(["src/layout-mcp-server.ts"]);
  });

  it(
    "lists and matches layouts over stdio",
    async () => {
      const result = await withLayoutMcp(async (t) => {
        const names = Object.keys(t).sort();
        expect(names).toEqual(["layout-get", "layout-list", "layout-match"]);
        const list = t["layout-list"] as ExecTool;
        const match = t["layout-match"] as ExecTool;
        const listed = await list.execute({ tag: "kpi" }, {});
        const matched = await match.execute(
          { intent: "pipeline how we work", hasSteps: true },
          {},
        );
        return { listed, matched };
      });
      const listText = JSON.stringify(result.listed);
      const matchText = JSON.stringify(result.matched);
      expect(listText).toMatch(/stats|fact|timeline/i);
      expect(matchText).toMatch(/process/i);
    },
    60_000,
  );
});
