import { describe, expect, it } from "vitest";
import { SpeechDoc, notesTextForSlide, parseSpeechJson } from "./speech.js";

describe("SpeechDoc", () => {
  it("accepts a valid deck speech", () => {
    const doc = {
      slides: [
        {
          index: 1,
          heading: "Intro",
          theses: "A\nB",
          speech: "Hello everyone.",
        },
      ],
    };
    expect(SpeechDoc.parse(doc).slides).toHaveLength(1);
  });

  it("rejects empty speech", () => {
    expect(() =>
      SpeechDoc.parse({
        slides: [{ index: 1, heading: "H", theses: "t", speech: "  " }],
      }),
    ).toThrow();
  });
});

describe("notesTextForSlide", () => {
  it("joins theses and speech with a blank line", () => {
    expect(notesTextForSlide({ theses: "a\nb", speech: "full" })).toBe("a\nb\n\nfull");
  });
});

describe("parseSpeechJson", () => {
  it("parses JSON string", () => {
    const raw = JSON.stringify({
      slides: [{ index: 1, heading: "H", theses: "t", speech: "s" }],
    });
    expect(parseSpeechJson(raw).slides[0].heading).toBe("H");
  });
});
