import { describe, expect, it } from "vitest";
import { initialFreeDeckWatch, markFreeDeckReadyTracked, nextFreeDeckWatch, noteFreeDeckBuilding, watchForDeck } from "./free-deck-metrika";

describe("nextFreeDeckWatch", () => {
  it("tracks when a free deck goes from building to ready", () => {
    let watch = initialFreeDeckWatch();
    watch = nextFreeDeckWatch(watch, { status: "preview" }).watch;
    watch = nextFreeDeckWatch(watch, { billingKnown: true, billingKind: "free" }).watch;
    const ready = nextFreeDeckWatch(watch, { status: "ready" });
    expect(ready.track).toBe(true);
    expect(nextFreeDeckWatch(ready.watch, { status: "ready" }).track).toBe(false);
  });

  it("waits for billing if ready arrives first", () => {
    let watch = initialFreeDeckWatch();
    watch = nextFreeDeckWatch(watch, { status: "generating" }).watch;
    const ready = nextFreeDeckWatch(watch, { status: "ready" });
    expect(ready.track).toBe(false);
    expect(nextFreeDeckWatch(ready.watch, { billingKnown: true, billingKind: "free" }).track).toBe(true);
  });

  it("skips an already ready deck", () => {
    const watch = initialFreeDeckWatch();
    const opened = nextFreeDeckWatch(watch, { status: "ready" });
    expect(opened.track).toBe(false);
    expect(
      nextFreeDeckWatch(opened.watch, { billingKnown: true, billingKind: "free" }).track,
    ).toBe(false);
  });

  it("skips paid decks", () => {
    let watch = initialFreeDeckWatch();
    watch = nextFreeDeckWatch(watch, { billingKnown: true, billingKind: "credit" }).watch;
    watch = nextFreeDeckWatch(watch, { status: "preview" }).watch;
    expect(nextFreeDeckWatch(watch, { status: "ready" }).track).toBe(false);
  });
});

describe("markFreeDeckReadyTracked", () => {
  it("records the deck once", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    } as Storage;
    expect(markFreeDeckReadyTracked("deck-1", storage)).toBe(true);
    expect(markFreeDeckReadyTracked("deck-1", storage)).toBe(false);
    expect(markFreeDeckReadyTracked("deck-2", storage)).toBe(true);
  });

  it("keeps a building mark so the player can count a deck that is already ready", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    } as Storage;
    noteFreeDeckBuilding("deck-1", "preview", storage);
    const ready = nextFreeDeckWatch(watchForDeck("deck-1", storage), {
      status: "ready",
      billingKnown: true,
      billingKind: "free",
    });
    expect(ready.track).toBe(true);
  });
});
