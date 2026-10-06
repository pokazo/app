import { describe, expect, it } from "vitest";
import { Outline } from "./outline.js";

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
          imageQuery: "",
          iconHint: "",
        },
        {
          heading: "Dominant force",
          points: ["Enterprise backbone", "TIOBE #4"],
          intent: "Show scale with photo",
          visual: "image-right",
          imageQuery: "modern glass office atrium",
          iconHint: "",
        },
        {
          heading: "Why teams stay",
          points: ["Stability"],
          intent: "Support with icon row",
          visual: "icon",
          imageQuery: "",
          iconHint: "java",
        },
        {
          heading: "Thanks",
          points: [],
          intent: "Close",
          visual: "end",
          imageQuery: "",
          iconHint: "",
        },
      ],
    });
    expect(parsed.slides[1]?.visual).toBe("image-right");
    expect(parsed.slides[1]?.imageQuery).toContain("atrium");
  });

  it("rejects more than 5 points", () => {
    expect(() =>
      Outline.parse({
        title: "X",
        slides: [
          {
            heading: "A",
            points: ["1", "2", "3", "4", "5", "6"],
            intent: "too many",
            visual: "none",
            imageQuery: "",
            iconHint: "",
          },
          {
            heading: "B",
            points: [],
            intent: "b",
            visual: "none",
            imageQuery: "",
            iconHint: "",
          },
          {
            heading: "C",
            points: [],
            intent: "c",
            visual: "none",
            imageQuery: "",
            iconHint: "",
          },
          {
            heading: "D",
            points: [],
            intent: "d",
            visual: "none",
            imageQuery: "",
            iconHint: "",
          },
        ],
      }),
    ).toThrow();
  });
});
