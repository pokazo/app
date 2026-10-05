import { describe, expect, it } from "vitest";
import { outlineTitle, slidesFromOutline } from "./view-meta.js";

describe("slidesFromOutline", () => {
  it("maps headings 1-based", () => {
    expect(
      slidesFromOutline({
        title: "Фотосинтез",
        slides: [{ heading: "Свет" }, { heading: "Вода" }],
      }),
    ).toEqual([
      { index: 1, heading: "Свет" },
      { index: 2, heading: "Вода" },
    ]);
  });

  it("falls back to numbered slides", () => {
    expect(slidesFromOutline(null, 2)).toEqual([
      { index: 1, heading: "Слайд 1" },
      { index: 2, heading: "Слайд 2" },
    ]);
  });
});

describe("outlineTitle", () => {
  it("reads title", () => {
    expect(outlineTitle({ title: " Тема " }, "x")).toBe("Тема");
    expect(outlineTitle({}, "x")).toBe("x");
  });
});
