import { describe, expect, it } from "vitest";
import {
  clickGoalParams,
  nextMetrikaHit,
  notePageUrl,
  pkGoalId,
  resetMetrikaHitUrl,
  UI_CLICK_GOAL,
} from "./metrika";

describe("pkGoalId", () => {
  it("maps data-pk to Metrika JS goal ids", () => {
    expect(pkGoalId("cta-create")).toBe("cta_create");
    expect(pkGoalId("cta-pricing-nav")).toBe("cta_pricing_nav");
    expect(pkGoalId("pricing-view")).toBe("pricing_view");
    expect(UI_CLICK_GOAL).toBe("ui_click");
  });
});

describe("nextMetrikaHit", () => {
  it("skips the first url and repeats, then hits a new route", () => {
    expect(nextMetrikaHit(null, "/")).toEqual({ last: "/", hit: false });
    expect(nextMetrikaHit("/", "/")).toEqual({ last: "/", hit: false });
    expect(nextMetrikaHit("/", "/app")).toEqual({ last: "/app", hit: true });
  });

  it("notePageUrl follows the same rule", () => {
    resetMetrikaHitUrl();
    expect(notePageUrl("/")).toBe(false);
    expect(notePageUrl("/")).toBe(false);
    expect(notePageUrl("/view/deck")).toBe(true);
    resetMetrikaHitUrl();
  });
});

describe("clickGoalParams", () => {
  it("keeps the control name and data-pk, not a typed value", () => {
    expect(
      clickGoalParams("/login", {
        dataPk: "auth-otp-send",
        ariaLabel: null,
        text: "Получить код",
        className: "pk",
        tag: "button",
        inputType: null,
      }),
    ).toEqual({ path: "/login", pk: "auth-otp-send", name: "Получить код" });
    expect(
      clickGoalParams("/app", {
        dataPk: null,
        ariaLabel: null,
        text: "секрет темы",
        className: null,
        tag: "input",
        inputType: "text",
      }),
    ).toEqual({ path: "/app", pk: "", name: "text" });
  });

  it("falls back to aria-label and class", () => {
    expect(
      clickGoalParams("/view/1", {
        dataPk: null,
        ariaLabel: "Страница 2",
        text: "",
        className: "deck-thumb",
        tag: "button",
        inputType: null,
      }).name,
    ).toBe("Страница 2");
    expect(
      clickGoalParams("/view/1", {
        dataPk: null,
        ariaLabel: null,
        text: "  ",
        className: "deck-hit right",
        tag: "button",
        inputType: null,
      }).name,
    ).toBe("deck-hit");
  });
});
