import { describe, expect, it } from "vitest";
import {
  deckFromJobId,
  formatWorkerJobLine,
  jobDurationMs,
  summarizeJobData,
} from "./queue-worker-log.js";

describe("queue-worker-log", () => {
  it("parses deck id from rewrite/structure job ids", () => {
    const id = "b86dd26f-c00d-4437-991c-ce096d7ea525";
    expect(deckFromJobId(`rewrite-${id}`)).toBe(id);
    expect(deckFromJobId(`structure-${id}`)).toBe(id);
    expect(deckFromJobId(id)).toBe(id);
    expect(deckFromJobId("other-job")).toBeNull();
  });

  it("summarizes job data and duration for grep-friendly lines", () => {
    expect(
      summarizeJobData({
        id: "deck-1",
        slide: 3,
        op: { op: "delete" },
      }),
    ).toEqual({ deck: "deck-1", slide: "3", op: "delete" });
    expect(jobDurationMs({ processedOn: 1000, finishedOn: 4500 })).toBe(3500);
    expect(jobDurationMs({ processedOn: undefined, finishedOn: 4500 })).toBeNull();
    expect(
      formatWorkerJobLine("completed", "deck-edits", {
        name: "rewrite-slide",
        id: "rewrite-deck-1",
        data: { id: "deck-1", slide: 2 },
        processedOn: 10,
        finishedOn: 1010,
      }),
    ).toBe(
      "[queue] worker_job_completed queue=deck-edits job=rewrite-slide jobId=rewrite-deck-1 deck=deck-1 slide=2 op=- attempts=- durationMs=1000",
    );
  });
});
