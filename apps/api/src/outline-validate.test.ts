import { describe, expect, it } from "vitest";
import type { OutlineT } from "./outline.js";
import {
  OUTLINE_VALIDATE_TOOL_DESCRIPTION,
  expectForVisual,
  formatOutlineValidateIssues,
  outlineValidate,
} from "./outline-validate.js";

const base = {
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

function photoSlide(heading: string, side: "image-right" | "image-left", q: string) {
  return {
    heading,
    points: ["a", "b"],
    intent: "geo",
    visual: side,
    ...base,
    imageQuery: q,
  };
}

/** Minimal deck that passes plan gate except we swap slides 7–8. */
function deckWithFeaturesProcess(opts: {
  features: OutlineT["slides"][0]["features"];
  process: OutlineT["slides"][0]["process"];
}): OutlineT {
  return {
    title: "Бодибилдинг",
    slides: [
      {
        heading: "Старт",
        points: ["лид"],
        intent: "open",
        visual: "hero",
        ...base,
        kicker: "ТЕМА",
        imageQuery: "gym athlete barbell",
      },
      photoSlide("Место", "image-right", "gym floor weights"),
      photoSlide("Зал", "image-left", "dumbbell rack closeup"),
      photoSlide("Тренинг", "image-right", "bench press form"),
      {
        heading: "Цифры",
        points: [],
        intent: "stats",
        visual: "stats",
        ...base,
        stats: [
          { value: "3x", label: "в неделю", note: "объём" },
          { value: "8–12", label: "повторов", note: "гипертрофия" },
        ],
        source: "ACSМ",
      },
      {
        heading: "Цитата",
        points: ["Сила растёт с терпением"],
        intent: "voice",
        visual: "quote",
        ...base,
      },
      {
        heading: "Мифы и реальность бодибилдинга",
        points: [],
        intent: "myths",
        visual: "features",
        ...base,
        features: opts.features,
      },
      {
        heading: "Баланс пользы и мер безопасности",
        points: ["Разминка", "Техника", "Восстановление"],
        intent: "safety",
        visual: "process",
        ...base,
        process: opts.process,
      },
    ],
  };
}

describe("OUTLINE_VALIDATE_TOOL_DESCRIPTION", () => {
  it("states exact features/process contracts", () => {
    expect(OUTLINE_VALIDATE_TOOL_DESCRIPTION).toMatch(/exactly 3/i);
    expect(OUTLINE_VALIDATE_TOOL_DESCRIPTION).toMatch(/process: 3–5/i);
    expect(OUTLINE_VALIDATE_TOOL_DESCRIPTION).toMatch(/issues\[\]\.expect|expect \{/i);
    expect(OUTLINE_VALIDATE_TOOL_DESCRIPTION).toMatch(/submit_outline/);
  });
});

describe("expectForVisual", () => {
  it("returns catalog contract for features and process", () => {
    const f = expectForVisual("features");
    expect(f.outlineFields).toMatch(/features/);
    expect(f.example).toMatch(/carbon-/);
    expect(f.iconHints?.length).toBeGreaterThan(3);

    const p = expectForVisual("process");
    expect(p.outlineFields).toMatch(/process/);
    expect(p.antiPatterns.length).toBeGreaterThan(0);
  });

  it("includes H1 limits for statement so validate feedback can shorten heading", () => {
    const s = expectForVisual("statement");
    expect(s.limits?.H1).toMatch(/3–10 words/);
    expect(s.outlineFields).toMatch(/3–10 words/);
  });
});

describe("outlineValidate", () => {
  it("returns ok:false with expect for features×2 and process×0", () => {
    const raw = deckWithFeaturesProcess({
      features: [
        { title: "Миф белка", body: "…", iconHint: "carbon-idea" },
        { title: "Реальность", body: "…", iconHint: "carbon-security" },
      ],
      process: [],
    });
    const result = outlineValidate(raw, { slideCount: 8 });
    expect(result.ok).toBe(false);
    if (result.ok) return;

    const featureIssue = result.issues.find((i) => i.visual === "features");
    const processIssue = result.issues.find((i) => i.visual === "process");
    expect(featureIssue?.message).toMatch(/features|≥3|сейчас 2/i);
    expect(featureIssue?.expect.outlineFields).toMatch(/features/);
    expect(featureIssue?.expect.example).toMatch(/features/);
    expect(featureIssue?.expect.iconHints?.some((h) => h.startsWith("carbon-"))).toBe(true);

    expect(processIssue?.message).toMatch(/process|сейчас 0/i);
    expect(processIssue?.expect.outlineFields).toMatch(/process/);
    expect(processIssue?.expect.example).toMatch(/process/);
  });

  it("returns ok:true for valid features×3 and process≥3", () => {
    const raw = deckWithFeaturesProcess({
      features: [
        { title: "A", body: "1", iconHint: "carbon-idea" },
        { title: "B", body: "2", iconHint: "carbon-security" },
        { title: "C", body: "3", iconHint: "carbon-rocket" },
      ],
      process: [
        { title: "Разминка", iconHint: "carbon-activity" },
        { title: "Техника", iconHint: "carbon-settings" },
        { title: "Отдых", iconHint: "carbon-time" },
      ],
    });
    const result = outlineValidate(raw, { slideCount: 8 });
    expect(result).toMatchObject({ ok: true, slides: 8, title: "Бодибилдинг" });
  });

  it("never throws on schema garbage", () => {
    const result = outlineValidate({ title: 1, slides: "nope" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]?.expect.outlineFields).toMatch(/Outline/);
  });

  it("formatOutlineValidateIssues includes expect blocks", () => {
    const raw = deckWithFeaturesProcess({
      features: [
        { title: "A", body: "1", iconHint: "carbon-idea" },
        { title: "B", body: "2", iconHint: "carbon-security" },
      ],
      process: [],
    });
    const result = outlineValidate(raw, { slideCount: 8 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const text = formatOutlineValidateIssues(result.issues);
    expect(text).toMatch(/expect\.outlineFields/);
    expect(text).toMatch(/expect\.example/);
  });
});
