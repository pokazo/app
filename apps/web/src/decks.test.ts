import { describe, expect, it } from "vitest";
import {
  APP_HISTORY_PATH,
  DECK_THEMES,
  deckBusy,
  deckStatusLabel,
  formatWhen,
  sanitizeDeckTheme,
} from "./decks";

describe("deck history screen", () => {
  it("lives on its own app path", () => {
    expect(APP_HISTORY_PATH).toBe("/app/history");
  });

  it("labels pipeline statuses in Russian", () => {
    expect(deckStatusLabel("queued")).toBe("В очереди");
    expect(deckStatusLabel("ready")).toBe("Готово");
    expect(deckStatusLabel("weird")).toBe("weird");
  });

  it("treats queued generating building as busy", () => {
    expect(deckBusy("queued")).toBe(true);
    expect(deckBusy("ready")).toBe(false);
    expect(deckBusy("failed")).toBe(false);
  });

  it("formats createdAt for the list", () => {
    expect(formatWhen("not-a-date")).toBe("");
    expect(formatWhen("2026-10-05T12:00:00.000Z")).toMatch(/\d/);
  });
});

describe("deck theme picker", () => {
  it("starts with Auto and the official Slidev ids", () => {
    expect(DECK_THEMES[0]?.id).toBe("auto");
    expect(DECK_THEMES.map((t) => t.id)).toEqual([
      "auto",
      "default",
      "seriph",
      "apple-basic",
      "bricks",
      "shibainu",
    ]);
  });

  it("keeps a known pick and falls back unknown to auto", () => {
    expect(sanitizeDeckTheme("seriph")).toBe("seriph");
    expect(sanitizeDeckTheme("hack-theme")).toBe("auto");
    expect(sanitizeDeckTheme(null)).toBe("auto");
  });
});
