import { describe, expect, it } from "vitest";
import { toDeckDto } from "./deck-dto.js";

describe("toDeckDto", () => {
  it("adds viewUrl only when ready", () => {
    const row = {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      topic: "Фотосинтез",
      status: "generating",
      error: null,
      slide_count: 8,
      created_at: new Date("2026-10-04T18:00:00.000Z"),
      updated_at: new Date("2026-10-04T18:01:00.000Z"),
    };
    expect(toDeckDto(row).viewUrl).toBeNull();
    expect(toDeckDto({ ...row, status: "ready" }).viewUrl).toMatch(
      /\/view\/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee$/,
    );
  });
});
