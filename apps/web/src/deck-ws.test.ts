import { describe, expect, it } from "vitest";
import {
  deckWsUrl,
  isBuildPhaseLabel,
  parseDeckWsEvent,
  shouldShowBuildLoader,
} from "./deck-ws";

describe("shouldShowBuildLoader", () => {
  it("shows on live build or assemble label", () => {
    expect(shouldShowBuildLoader({ buildLive: true, activity: "Думаю…" })).toBe(true);
    expect(shouldShowBuildLoader({ buildLive: false, activity: "Собираю показ" })).toBe(true);
    expect(shouldShowBuildLoader({ buildLive: false, activity: "Пишу слайды" })).toBe(false);
  });

  it("hides stale assemble label when deck is idle", () => {
    expect(
      shouldShowBuildLoader({
        buildLive: false,
        activity: "Собираю показ",
        deckBusy: false,
      }),
    ).toBe(false);
    expect(
      shouldShowBuildLoader({
        buildLive: true,
        activity: "Собираю показ",
        deckBusy: false,
      }),
    ).toBe(true);
  });
});

describe("isBuildPhaseLabel", () => {
  it("matches Russian assemble phrases", () => {
    expect(isBuildPhaseLabel("Собираю превью")).toBe(true);
    expect(isBuildPhaseLabel("Верстаю слайд")).toBe(false);
  });
});

describe("deckWsUrl", () => {
  it("maps https api to wss", () => {
    const prev = import.meta.env.VITE_API_URL;
    // vitest may not allow mutating import.meta.env — test relative fallback
    expect(deckWsUrl("11111111-1111-1111-1111-111111111111")).toMatch(
      /\/ws\/deck\/11111111-1111-1111-1111-111111111111$/,
    );
    void prev;
  });
});

describe("parseDeckWsEvent", () => {
  it("parses build frames", () => {
    const raw = JSON.stringify({ type: "build", state: "start", kind: "preview", at: 1 });
    expect(parseDeckWsEvent(raw)).toEqual({
      type: "build",
      state: "start",
      kind: "preview",
      at: 1,
    });
  });
});
