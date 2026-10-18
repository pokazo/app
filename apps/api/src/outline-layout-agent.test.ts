import { describe, expect, it } from "vitest";
import {
  createSubmitOutlineTool,
  OUTLINE_LAYOUT_SYSTEM,
  outlineRetryFeedback,
  summarizeOutlineIssues,
} from "./outline-layout-agent.js";
import type { OutlineT } from "./outline.js";

describe("OUTLINE_LAYOUT_SYSTEM", () => {
  it("requires reading limits before picking a visual", () => {
    expect(OUTLINE_LAYOUT_SYSTEM).toMatch(/limits\.H1|limits \(H1/i);
    expect(OUTLINE_LAYOUT_SYSTEM).toMatch(/statement: H1 ≈3–10 words/);
  });
});

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

describe("summarizeOutlineIssues", () => {
  it("returns dash for empty", () => {
    expect(summarizeOutlineIssues([])).toBe("-");
  });

  it("compacts and caps issues", () => {
    const issues = Array.from({ length: 8 }, (_, i) => ({
      slide: i + 1,
      code: "empty_slide",
      message: `slide   ${i + 1}\nprocess пустой`,
    }));
    const s = summarizeOutlineIssues(issues, 3);
    expect(s).toContain("#1 empty_slide: slide 1 process пустой");
    expect(s).toContain("+5 more");
    expect(s).not.toContain("\n");
  });
});

describe("submit_outline with malformed args", () => {
  it("returns ok:false issues instead of throwing", async () => {
    let accepted: OutlineT | null = null;
    const attempts: unknown[] = [];
    const t = createSubmitOutlineTool({
      slideCount: 4,
      onAccepted: (o) => {
        accepted = o;
      },
      onAttempt: (raw) => attempts.push(raw),
    });
    const result = (await t.execute!({ title: "T", slides: [{ heading: "A" }] } as never, {} as never)) as {
      ok: boolean;
      issues: unknown;
    };
    expect(result.ok).toBe(false);
    expect(accepted).toBeNull();
    expect(attempts).toHaveLength(1);
  });
});

describe("outlineRetryFeedback", () => {
  const trace = {
    steps: 5,
    validateCalls: 3,
    validateOk: 0,
    lastValidateIssues: "#2 empty_slide: features пустой",
    submitCalls: 1,
    lastSubmitIssues: "#5 empty_slide: process пустой",
    finishReason: "stop",
    lastText: "",
  };

  it("prefers submit issues and includes the last draft", () => {
    const s = outlineRetryFeedback(trace, '{"title":"X"}');
    expect(s).toContain("#5 empty_slide: process пустой");
    expect(s).not.toContain("#2 empty_slide");
    expect(s).toContain('{"title":"X"}');
    expect(s).toContain("image-right");
  });

  it("falls back to validate issues and omits an empty draft", () => {
    const s = outlineRetryFeedback({ ...trace, lastSubmitIssues: "-" }, "");
    expect(s).toContain("#2 empty_slide: features пустой");
    expect(s).not.toContain("черновик outline");
  });
});
