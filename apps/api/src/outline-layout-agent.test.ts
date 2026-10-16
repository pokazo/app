import { describe, expect, it } from "vitest";
import { createSubmitOutlineTool } from "./outline-layout-agent.js";
import type { OutlineT } from "./outline.js";

const emptyVisual = {
  imageQuery: "",
  iconHint: "",
  kicker: "",
  source: "",
  steps: [] as const,
  stats: [] as const,
  skills: [] as const,
  cards: [] as const,
  features: [] as const,
  process: [] as const,
  palette: "",
  pie: [],
  chartTitle: "",
};

describe("createSubmitOutlineTool", () => {
  it("rejects text-only visuals", async () => {
    let accepted: OutlineT | null = null;
    const t = createSubmitOutlineTool({
      slideCount: 4,
      onAccepted: (o) => {
        accepted = o;
      },
    });
    const result = await t.execute!(
      {
        title: "T",
        slides: [
          { heading: "A", points: ["1"], intent: "a", visual: "none", ...emptyVisual },
          { heading: "B", points: ["1"], intent: "b", visual: "none", ...emptyVisual },
          { heading: "C", points: ["1"], intent: "c", visual: "none", ...emptyVisual },
          { heading: "D", points: ["1"], intent: "d", visual: "none", ...emptyVisual },
        ],
      },
      {} as never,
    );
    expect(result).toMatchObject({ ok: false });
    expect(accepted).toBeNull();
    const issues = (result as { issues?: unknown }).issues;
    expect(Array.isArray(issues)).toBe(true);
    expect(JSON.stringify(issues)).toMatch(/expect|outlineFields/i);
  });

  it("returns structured expect when features underfilled", async () => {
    let accepted: OutlineT | null = null;
    const t = createSubmitOutlineTool({
      slideCount: 3,
      onAccepted: (o) => {
        accepted = o;
      },
    });
    const result = await t.execute!(
      {
        title: "T",
        slides: [
          {
            heading: "Myths",
            points: [],
            intent: "m",
            visual: "features",
            ...emptyVisual,
            features: [
              { title: "A", body: "1", iconHint: "carbon-idea" },
              { title: "B", body: "2", iconHint: "carbon-security" },
            ],
          },
          {
            heading: "Photo",
            points: ["a"],
            intent: "g",
            visual: "image-right",
            ...emptyVisual,
            imageQuery: "gym",
          },
          {
            heading: "Quote",
            points: ["line"],
            intent: "q",
            visual: "quote",
            ...emptyVisual,
          },
        ],
      },
      {} as never,
    );
    expect(result).toMatchObject({ ok: false });
    expect(accepted).toBeNull();
    const issues = (result as { ok: false; issues: Array<{ expect?: { outlineFields?: string } }> })
      .issues;
    expect(issues.some((i) => i.expect?.outlineFields?.includes("features"))).toBe(true);
  });
});
