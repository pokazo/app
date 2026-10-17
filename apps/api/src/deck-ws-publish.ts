import { basename } from "node:path";
import {
  activityEvent,
  buildEvent,
  type DeckBuildKind,
} from "./deck-ws-events.js";
import { deckWsPublish } from "./deck-ws-hub.js";

export function deckIdFromWorkDir(workDir: string): string {
  return basename(workDir);
}

export function publishDeckActivity(deckId: string, label: string): void {
  deckWsPublish(deckId, activityEvent(label));
}

export function publishDeckActivityFromWorkDir(workDir: string, label: string): void {
  const id = deckIdFromWorkDir(workDir);
  if (!id) return;
  publishDeckActivity(id, label);
}

/** Wrap a Slidev build so clients get live build start/end on the deck WS. */
export async function withDeckBuildPublish<T>(
  deckId: string,
  kind: DeckBuildKind,
  run: () => Promise<T>,
): Promise<T> {
  deckWsPublish(deckId, buildEvent("start", kind));
  try {
    return await run();
  } finally {
    deckWsPublish(deckId, buildEvent("end", kind));
  }
}
