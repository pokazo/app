import { describe, expect, it } from "vitest";
import {
  activityEvent,
  buildEvent,
  isBuildPhaseLabel,
  parseDeckWsEvent,
  serializeDeckWsEvent,
} from "./deck-ws-events.js";

describe("isBuildPhaseLabel", () => {
  it("matches assemble labels", () => {
    expect(isBuildPhaseLabel("Собираю превью")).toBe(true);
    expect(isBuildPhaseLabel("Собираю показ")).toBe(true);
    expect(isBuildPhaseLabel("Думаю…")).toBe(false);
    expect(isBuildPhaseLabel("")).toBe(false);
  });
});

describe("deck ws event serialize", () => {
  it("roundtrips activity and build", () => {
    const a = activityEvent("Собираю показ", 1);
    expect(parseDeckWsEvent(serializeDeckWsEvent(a))).toEqual(a);
    const b = buildEvent("start", "preview", 2);
    expect(parseDeckWsEvent(serializeDeckWsEvent(b))).toEqual(b);
    const e = buildEvent("end", "final", 3);
    expect(parseDeckWsEvent(serializeDeckWsEvent(e))).toEqual(e);
  });

  it("returns null on garbage", () => {
    expect(parseDeckWsEvent("not-json")).toBeNull();
    expect(parseDeckWsEvent("{}")).toBeNull();
  });
});
