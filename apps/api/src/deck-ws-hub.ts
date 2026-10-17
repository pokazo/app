import type { WebSocket } from "ws";
import {
  type DeckWsEvent,
  serializeDeckWsEvent,
} from "./deck-ws-events.js";

type SocketLike = Pick<WebSocket, "readyState" | "send" | "OPEN">;

const rooms = new Map<string, Set<SocketLike>>();

export function deckWsSubscribe(deckId: string, ws: SocketLike): void {
  let set = rooms.get(deckId);
  if (!set) {
    set = new Set();
    rooms.set(deckId, set);
  }
  set.add(ws);
}

export function deckWsUnsubscribe(deckId: string, ws: SocketLike): void {
  const set = rooms.get(deckId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) rooms.delete(deckId);
}

export function deckWsPublish(deckId: string, event: DeckWsEvent): void {
  const set = rooms.get(deckId);
  if (!set?.size) return;
  const raw = serializeDeckWsEvent(event);
  for (const ws of [...set]) {
    if (ws.readyState !== ws.OPEN) {
      set.delete(ws);
      continue;
    }
    try {
      ws.send(raw);
    } catch {
      set.delete(ws);
    }
  }
  if (set.size === 0) rooms.delete(deckId);
}

/** Test helper — clear all rooms. */
export function deckWsResetForTests(): void {
  rooms.clear();
}

export function deckWsRoomSize(deckId: string): number {
  return rooms.get(deckId)?.size ?? 0;
}
