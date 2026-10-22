import { describe, expect, it } from "vitest";
import {
  clampSlideCount,
  createSetSlideCountTool,
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

  it("tells the planner to call set-slide-count only for an explicit count", () => {
    expect(OUTLINE_LAYOUT_SYSTEM).toMatch(/set-slide-count/);
    expect(OUTLINE_LAYOUT_SYSTEM).toMatch(/9 класс/);
    expect(OUTLINE_LAYOUT_SYSTEM).toMatch(/do not call set-slide-count/i);
  });
});

function textSlides(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    heading: `S${i + 1}`,
    points: ["1"],
    intent: "t",
    visual: "none" as const,
    ...emptyVisual,
  }));
}

describe("set-slide-count", () => {
  it("clamps to the slider range", () => {
    expect(clampSlideCount(6)).toBe(6);
    expect(clampSlideCount(1)).toBe(3);
    expect(clampSlideCount(100)).toBe(16);
  });

  it("overrides the slider, and submit_outline then expects that count", async () => {
    const state = { slideCount: 8 };
    const setCount = createSetSlideCountTool(state);
    const before = createSubmitOutlineTool({
      slideCount: state,
      outlineModelId: "openai/gpt-4.1-mini",
      onAccepted: () => {},
    });
    const kept = (await before.execute!(
      { title: "T", slides: textSlides(6) },
      {} as never,
    )) as { ok: boolean; issues: Array<{ code?: string; message?: string }> };
    expect(kept.ok).toBe(false);
    expect(kept.issues.some((i) => i.code === "slide_count" && /ожидалось 8/.test(i.message ?? ""))).toBe(
      true,
    );

    const set = (await setCount.execute!({ slideCount: 6 }, {} as never)) as {
      ok: boolean;
      slideCount: number;
      previous: number;
    };
    expect(set).toMatchObject({ ok: true, slideCount: 6, previous: 8 });
    expect(state.slideCount).toBe(6);

    const after = createSubmitOutlineTool({
      slideCount: state,
      outlineModelId: "openai/gpt-4.1-mini",
      onAccepted: () => {},
    });
    const moved = (await after.execute!(
      { title: "T", slides: textSlides(6) },
      {} as never,
    )) as { ok: boolean; issues: Array<{ code?: string }> };
    expect(moved.ok).toBe(false);
    expect(moved.issues.some((i) => i.code === "slide_count")).toBe(false);
  });

  it("leaves the slider in place when the tool is not called", async () => {
    const state = { slideCount: 5 };
    const submit = createSubmitOutlineTool({
      slideCount: state,
      outlineModelId: "openai/gpt-4.1-mini",
      onAccepted: () => {},
    });
    const result = (await submit.execute!(
      { title: "T", slides: textSlides(5) },
      {} as never,
    )) as { issues: Array<{ code?: string }> };
    expect(state.slideCount).toBe(5);
    expect(result.issues.some((i) => i.code === "slide_count")).toBe(false);
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
      outlineModelId: "openai/gpt-4.1-mini",
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
      outlineModelId: "openai/gpt-4.1-mini",
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
      outlineModelId: "openai/gpt-4.1-mini",
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
