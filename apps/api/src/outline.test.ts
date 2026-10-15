import { describe, expect, it } from "vitest";
import { Outline } from "./outline.js";

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

describe("Outline schema", () => {
  it("accepts rich slides with visual and intent", () => {
    const parsed = Outline.parse({
      title: "Java today",
      slides: [
        {
          heading: "Java today",
          points: [],
          intent: "Open the deck",
          visual: "cover",
          ...emptyVisual,
        },
        {
          heading: "Dominant force",
          points: ["Enterprise backbone", "TIOBE #4"],
          intent: "Show scale with photo",
          visual: "image-right",
          ...emptyVisual,
          imageQuery: "modern glass office atrium",
        },
        {
          heading: "Why teams stay",
          points: ["Stability"],
          intent: "Support with icon row",
          visual: "icon",
          ...emptyVisual,
          iconHint: "java",
        },
        {
          heading: "Thanks",
          points: [],
          intent: "Close",
          visual: "end",
          ...emptyVisual,
        },
      ],
    });
    expect(parsed.slides[1]?.visual).toBe("image-right");
    expect(parsed.slides[1]?.imageQuery).toContain("atrium");
  });

  it("accepts timeline and stats payloads", () => {
    const parsed = Outline.parse({
      title: "Anton",
      slides: [
        {
          heading: "Cover",
          points: [],
          intent: "open",
          visual: "cover",
          ...emptyVisual,
        },
        {
          heading: "Цифры",
          points: [],
          intent: "kpi",
          visual: "stats",
          ...emptyVisual,
          kicker: "KEY METRICS",
          stats: [{ value: "12+", label: "лет в IT", note: "с 2012" }],
        },
        {
          heading: "Путь",
          points: [],
          intent: "path",
          visual: "timeline",
          ...emptyVisual,
          kicker: "TIMELINE",
          steps: [
            { phase: "2012", title: "Start", body: "first job", state: "done" },
            { phase: "2024", title: "Now", body: "staff+", state: "current" },
            { phase: "next", title: "Next", body: "scale", state: "todo" },
          ],
        },
        {
          heading: "End",
          points: [],
          intent: "close",
          visual: "end",
          ...emptyVisual,
        },
      ],
    });
    expect(parsed.slides[1]?.stats[0]?.value).toBe("12+");
    expect(parsed.slides[2]?.steps).toHaveLength(3);
  });

  it("accepts cards payload", () => {
    const parsed = Outline.parse({
      title: "Features",
      slides: [
        { heading: "Cover", points: [], intent: "open", visual: "cover", ...emptyVisual },
        {
          heading: "Возможности",
          points: [],
          intent: "features",
          visual: "cards",
          ...emptyVisual,
          kicker: "FEATURES",
          cards: [
            { title: "Быстро", body: "Сборка за минуты" },
            { title: "Плотно", body: "Карточки без пустоты" },
          ],
        },
        { heading: "C", points: [], intent: "c", visual: "end", ...emptyVisual },
        { heading: "D", points: [], intent: "d", visual: "end", ...emptyVisual },
      ],
    });
    expect(parsed.slides[1]?.visual).toBe("cards");
    expect(parsed.slides[1]?.cards).toHaveLength(2);
  });

  it("rejects more than 5 points", () => {
    expect(() =>
      Outline.parse({
        title: "X",
        slides: [
          { heading: "A", points: ["1", "2", "3", "4", "5", "6"], intent: "too many", visual: "none", ...emptyVisual },
          { heading: "B", points: [], intent: "b", visual: "none", ...emptyVisual },
          { heading: "C", points: [], intent: "c", visual: "none", ...emptyVisual },
          { heading: "D", points: [], intent: "d", visual: "none", ...emptyVisual },
        ],
      }),
    ).toThrow();
  });
});
