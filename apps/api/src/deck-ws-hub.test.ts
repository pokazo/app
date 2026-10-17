import { describe, expect, it, beforeEach } from "vitest";
import {
  deckWsPublish,
  deckWsResetForTests,
  deckWsRoomSize,
  deckWsSubscribe,
  deckWsUnsubscribe,
} from "./deck-ws-hub.js";
import { activityEvent, buildEvent } from "./deck-ws-events.js";

function fakeSocket() {
  const sent: string[] = [];
  return {
    readyState: 1,
    OPEN: 1,
    send(data: string) {
      sent.push(data);
    },
    sent,
  };
}

describe("deckWsHub", () => {
  beforeEach(() => deckWsResetForTests());

  it("delivers to subscribers and cleans up", () => {
    const a = fakeSocket();
    const b = fakeSocket();
    deckWsSubscribe("deck-1", a);
    deckWsSubscribe("deck-1", b);
    expect(deckWsRoomSize("deck-1")).toBe(2);
    deckWsPublish("deck-1", activityEvent("Собираю показ", 10));
    expect(a.sent).toHaveLength(1);
    expect(b.sent).toHaveLength(1);
    expect(JSON.parse(a.sent[0]).type).toBe("activity");
    deckWsPublish("deck-1", buildEvent("start", "final", 11));
    expect(JSON.parse(a.sent[1]).kind).toBe("final");
    deckWsUnsubscribe("deck-1", a);
    deckWsPublish("deck-1", buildEvent("end", "final", 12));
    expect(a.sent).toHaveLength(2);
    expect(b.sent).toHaveLength(3);
    deckWsUnsubscribe("deck-1", b);
    expect(deckWsRoomSize("deck-1")).toBe(0);
  });

  it("ignores closed sockets", () => {
    const dead = fakeSocket();
    dead.readyState = 3;
    deckWsSubscribe("deck-2", dead);
    deckWsPublish("deck-2", activityEvent("x", 1));
    expect(dead.sent).toHaveLength(0);
    expect(deckWsRoomSize("deck-2")).toBe(0);
  });
});
