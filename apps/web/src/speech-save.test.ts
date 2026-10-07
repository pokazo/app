import { describe, expect, it, vi } from "vitest";
import { createDebouncedSaver } from "./speech-save.js";

describe("createDebouncedSaver", () => {
  it("calls save once after quiet period", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const d = createDebouncedSaver(save, 500);
    d.schedule({ slides: [] } as never);
    d.schedule({ slides: [{ index: 1 }] } as never);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toEqual({ slides: [{ index: 1 }] });
    vi.useRealTimers();
  });
});
