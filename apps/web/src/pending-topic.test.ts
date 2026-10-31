import { afterEach, describe, expect, it, vi } from "vitest";
import { clearPendingTopic, getPendingTopic, stashPendingTopic } from "./pending-topic";

afterEach(() => {
  clearPendingTopic();
  vi.unstubAllGlobals();
});

describe("pending-topic", () => {
  it("keeps topic across repeated get calls (Strict Mode remount)", () => {
    stashPendingTopic("  Фотосинтез, 8 слайдов  ");
    expect(getPendingTopic()).toBe("Фотосинтез, 8 слайдов");
    expect(getPendingTopic()).toBe("Фотосинтез, 8 слайдов");
    clearPendingTopic();
    expect(getPendingTopic()).toBe("");
  });

  it("persists to sessionStorage", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
    stashPendingTopic("длинный конспект для доклада");
    expect(store.get("pokazo:pending-topic")).toBe("длинный конспект для доклада");
  });
});
