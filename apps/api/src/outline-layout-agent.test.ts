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
  });
});
