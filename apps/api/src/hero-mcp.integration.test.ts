import { describe, expect, it } from "vitest";
import { heroMcpSpawnSpec, withHeroMcp } from "./hero-mcp.js";

type ExecTool = { execute: (a: unknown, o: unknown) => Promise<unknown> };

describe("hero MCP stdio", () => {
  it("spawns with local tsx binary", () => {
    const spec = heroMcpSpawnSpec();
    expect(spec.command).toMatch(/tsx$/);
    expect(spec.args).toEqual(["src/hero-mcp-server.ts"]);
  });

  it(
    "lists and gets hero variants over stdio",
    async () => {
      const result = await withHeroMcp(async (t) => {
        const names = Object.keys(t).sort();
        expect(names).toEqual(["hero-get", "hero-list"]);
        expect(names).not.toContain("layout-list");
        const list = t["hero-list"] as ExecTool;
        const get = t["hero-get"] as ExecTool;
        const listed = await list.execute({ _: "" }, {});
        const got = await get.execute({ id: "ribbon" }, {});
        return { listed, got };
      });
      const listText = JSON.stringify(result.listed);
      const getText = JSON.stringify(result.got);
      expect(listText).toMatch(/ribbon/);
      expect(listText).toMatch(/needs/i);
      expect(getText).toMatch(/variant: ribbon|frontmatter/i);
    },
    60_000,
  );
});
