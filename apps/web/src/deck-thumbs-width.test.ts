import { describe, expect, it } from "vitest";
import {
  DECK_THUMBS_WIDTH_DEFAULT,
  DECK_THUMBS_WIDTH_MAX,
  DECK_THUMBS_WIDTH_MIN,
  clampDeckThumbsWidth,
  readDeckThumbsWidth,
  writeDeckThumbsWidth,
  type DeckThumbsWidthStorage,
} from "./deck-thumbs-width";

function memoryStorage(): DeckThumbsWidthStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("clampDeckThumbsWidth", () => {
  it("keeps the default band and rejects junk", () => {
    expect(clampDeckThumbsWidth(DECK_THUMBS_WIDTH_DEFAULT)).toBe(200);
    expect(clampDeckThumbsWidth(80)).toBe(DECK_THUMBS_WIDTH_MIN);
    expect(clampDeckThumbsWidth(2000)).toBe(DECK_THUMBS_WIDTH_MAX);
    expect(clampDeckThumbsWidth(Number.NaN)).toBe(DECK_THUMBS_WIDTH_DEFAULT);
    expect(clampDeckThumbsWidth(240.4)).toBe(240);
  });

  it("leaves room for the stage", () => {
    expect(clampDeckThumbsWidth(600, 1000)).toBe(600);
    expect(clampDeckThumbsWidth(900, 1000)).toBe(640);
    expect(clampDeckThumbsWidth(400, 500)).toBe(DECK_THUMBS_WIDTH_MIN);
  });
});

describe("readDeckThumbsWidth / writeDeckThumbsWidth", () => {
  it("round-trips a width and falls back when empty", () => {
    const storage = memoryStorage();
    expect(readDeckThumbsWidth(storage)).toBe(DECK_THUMBS_WIDTH_DEFAULT);
    expect(readDeckThumbsWidth(null)).toBe(DECK_THUMBS_WIDTH_DEFAULT);
    writeDeckThumbsWidth(333.2, storage);
    expect(storage.map.get("pokazo.deckThumbsWidth")).toBe("333");
    expect(readDeckThumbsWidth(storage)).toBe(333);
  });

  it("clamps stored extremes and ignores garbage", () => {
    const storage = memoryStorage();
    writeDeckThumbsWidth(20, storage);
    expect(readDeckThumbsWidth(storage)).toBe(DECK_THUMBS_WIDTH_MIN);
    storage.setItem("pokazo.deckThumbsWidth", "nope");
    expect(readDeckThumbsWidth(storage)).toBe(DECK_THUMBS_WIDTH_DEFAULT);
  });
});
