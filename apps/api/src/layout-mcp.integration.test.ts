import { describe, expect, it } from "vitest";
import { layoutMcpSpawnSpec, withLayoutMcp } from "./layout-mcp.js";
import { OUTLINE_VALIDATE_TOOL_DESCRIPTION } from "./outline-validate.js";

type ExecTool = { execute: (a: unknown, o: unknown) => Promise<unknown> };

function toolText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "content" in result) {
    const content = (result as { content?: Array<{ text?: string }> }).content;
    return content?.map((c) => c.text ?? "").join("\n") ?? JSON.stringify(result);
  }
  return JSON.stringify(result);
}

describe("layout MCP stdio", () => {
  it("spawns with local tsx binary", () => {
    const spec = layoutMcpSpawnSpec();
    expect(spec.command).toMatch(/tsx$/);
    expect(spec.args).toEqual(["src/layout-mcp-server.ts"]);
  });

  it("tool description states features/process contracts", () => {
    expect(OUTLINE_VALIDATE_TOOL_DESCRIPTION).toMatch(/exactly 3/i);
    expect(OUTLINE_VALIDATE_TOOL_DESCRIPTION).toMatch(/process: 3–5/);
  });

  it(
    "lists, matches, and outline-validate over stdio without crashing",
    async () => {
      const result = await withLayoutMcp(async (t) => {
        const names = Object.keys(t).sort();
        expect(names).toEqual([
          "layout-get",
          "layout-list",
          "layout-match",
          "outline-validate",
        ]);
        const list = t["layout-list"] as ExecTool;
        const match = t["layout-match"] as ExecTool;
        const validate = t["outline-validate"] as ExecTool;
        const listed = await list.execute({ tag: "kpi" }, {});
        const matched = await match.execute(
          {
            intent: "pipeline how we work",
            hasNumbers: false,
            hasSteps: true,
            wantsPhoto: false,
            featureCount: 0,
          },
          {},
        );
        const bad = await validate.execute(
          {
            outlineJson: JSON.stringify({
              title: "T",
              slides: [
                {
                  heading: "Myths",
                  points: [],
                  intent: "m",
                  visual: "features",
                  imageQuery: "",
                  iconHint: "",
                  kicker: "",
                  source: "",
                  steps: [],
                  stats: [],
                  skills: [],
                  cards: [],
                  features: [
                    { title: "A", body: "1", iconHint: "carbon-idea" },
                    { title: "B", body: "2", iconHint: "carbon-security" },
                  ],
                  process: [],
                  palette: "",
                  pie: [],
                  chartTitle: "",
                },
                {
                  heading: "Flow",
                  points: ["x", "y", "z"],
                  intent: "p",
                  visual: "process",
                  imageQuery: "",
                  iconHint: "",
                  kicker: "",
                  source: "",
                  steps: [],
                  stats: [],
                  skills: [],
                  cards: [],
                  features: [],
                  process: [],
                  palette: "",
                  pie: [],
                  chartTitle: "",
                },
                {
                  heading: "Photo",
                  points: ["a"],
                  intent: "g",
                  visual: "image-right",
                  imageQuery: "gym weights",
                  iconHint: "",
                  kicker: "",
                  source: "",
                  steps: [],
                  stats: [],
                  skills: [],
                  cards: [],
                  features: [],
                  process: [],
                  palette: "",
                  pie: [],
                  chartTitle: "",
                },
              ],
            }),
            slideCount: 3,
          },
          {},
        );
        const garbage = await validate.execute(
          { outlineJson: "{not-json", slideCount: 0 },
          {},
        );
        return { listed, matched, bad, garbage };
      });
      const listText = JSON.stringify(result.listed);
      const matchText = JSON.stringify(result.matched);
      expect(listText).toMatch(/stats|fact|timeline/i);
      expect(matchText).toMatch(/process/i);

      const badText = toolText(result.bad);
      expect(badText).toMatch(/"ok":\s*false/);
      expect(badText).toMatch(/features|process/i);
      expect(badText).toMatch(/outlineFields|expect/i);

      const garbageText = toolText(result.garbage);
      expect(garbageText).toMatch(/"ok":\s*false|not valid JSON/i);
    },
    60_000,
  );
});
