import { describe, expect, it } from "vitest";
import {
  APP_HISTORY_PATH,
  DECK_THEMES,
  SLIDE_COUNT_DEFAULT,
  SLIDE_COUNT_MAX,
  SLIDE_COUNT_MIN,
  SLIDE_COUNT_OPTIONS,
  deckBusy,
  deckBusyLabel,
  deckStatusLabel,
  deckViewable,
  formatWhen,
  sanitizeDeckTheme,
  sanitizeSlideCount,
} from "./decks";

describe("deck history screen", () => {
  it("lives on its own app path", () => {
    expect(APP_HISTORY_PATH).toBe("/app/history");
  });

  it("labels pipeline statuses in Russian", () => {
    expect(deckStatusLabel("queued")).toBe("В очереди");
    expect(deckStatusLabel("preview")).toMatch(/по мере сборки/);
    expect(deckStatusLabel("ready")).toBe("Готово");
    expect(deckStatusLabel("weird")).toBe("weird");
  });

  it("treats queued generating preview building as busy", () => {
    expect(deckBusy("queued")).toBe(true);
    expect(deckBusy("preview")).toBe(true);
    expect(deckBusy("ready")).toBe(false);
    expect(deckBusy("failed")).toBe(false);
  });

  it("prefers live activity over coarse status while busy", () => {
    expect(deckBusyLabel("generating", "Ищу фон")).toBe("Ищу фон");
    expect(deckBusyLabel("queued", "  ")).toBe("В очереди");
    expect(deckBusyLabel("ready", "Ищу фон")).toBe("Готово");
  });

  it("allows viewing preview and ready", () => {
    expect(deckViewable("preview")).toBe(true);
    expect(deckViewable("ready")).toBe(true);
    expect(deckViewable("generating")).toBe(false);
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
      "ink-dark",
      "brand-auto",
      "ocean",
      "forest",
      "slate",
      "amber",
      "wine",
      "neon",
      "sunset",
      "candy",
      "volt",
    ]);
  });

  it("gives each theme a CSS preview id and no emoji", () => {
    for (const t of DECK_THEMES) {
      expect(t.preview).toBe(t.id);
      expect(t).not.toHaveProperty("emoji");
      expect(t.colors.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps a known pick and falls back unknown to auto", () => {
    expect(sanitizeDeckTheme("seriph")).toBe("seriph");
    expect(sanitizeDeckTheme("hack-theme")).toBe("auto");
    expect(sanitizeDeckTheme(null)).toBe("auto");
  });
});

describe("slide count picker", () => {
  it("exposes options in the API clamp range", () => {
    expect(SLIDE_COUNT_OPTIONS[0]).toBe(SLIDE_COUNT_MIN);
    expect(SLIDE_COUNT_OPTIONS.at(-1)).toBe(SLIDE_COUNT_MAX);
    expect(SLIDE_COUNT_DEFAULT).toBe(8);
  });

  it("clamps and rounds raw values", () => {
    expect(sanitizeSlideCount(10)).toBe(10);
    expect(sanitizeSlideCount("12")).toBe(12);
    expect(sanitizeSlideCount(3)).toBe(3);
    expect(sanitizeSlideCount(2)).toBe(SLIDE_COUNT_MIN);
    expect(sanitizeSlideCount(99)).toBe(SLIDE_COUNT_MAX);
    expect(sanitizeSlideCount("nope")).toBe(SLIDE_COUNT_DEFAULT);
    expect(sanitizeSlideCount(null)).toBe(SLIDE_COUNT_DEFAULT);
  });
});
