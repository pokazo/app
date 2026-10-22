import { reachPkGoal } from "./metrika";

/** JS goal `deck_free_ready` — first free deck reached status ready. */
export const FREE_DECK_READY_GOAL = "deck-free-ready";

const STORAGE_PREFIX = "pk-deck-free-ready:";
const BUILDING_PREFIX = "pk-deck-free-building:";

export type FreeDeckWatch = {
  billingKind: string | null;
  billingKnown: boolean;
  lastStatus: string | null;
  sawBuilding: boolean;
  tracked: boolean;
};

export function initialFreeDeckWatch(): FreeDeckWatch {
  return {
    billingKind: null,
    billingKnown: false,
    lastStatus: null,
    sawBuilding: false,
    tracked: false,
  };
}

/**
 * Fire only after this page saw the deck still building, then `ready`,
 * and the deck was reserved as the free one. Opening an already-ready deck does not count.
 */
export function nextFreeDeckWatch(
  prev: FreeDeckWatch,
  patch: { status?: string | null; billingKind?: string | null; billingKnown?: boolean },
): { watch: FreeDeckWatch; track: boolean } {
  const watch: FreeDeckWatch = { ...prev };
  if (patch.billingKnown) {
    watch.billingKnown = true;
    watch.billingKind = patch.billingKind ?? null;
  }
  if (patch.status) {
    if (watch.lastStatus && watch.lastStatus !== "ready") watch.sawBuilding = true;
    watch.lastStatus = patch.status;
  }
  const track =
    !watch.tracked &&
    watch.billingKnown &&
    watch.billingKind === "free" &&
    watch.sawBuilding &&
    watch.lastStatus === "ready";
  if (track) watch.tracked = true;
  return { watch, track };
}

export function freeDeckReadyStorageKey(deckId: string): string {
  return `${STORAGE_PREFIX}${deckId}`;
}

export function freeDeckBuildingStorageKey(deckId: string): string {
  return `${BUILDING_PREFIX}${deckId}`;
}

/** Home navigates to the player at preview, so the player may first see `ready`. */
export function noteFreeDeckBuilding(deckId: string, status: string, storage: Storage | null = freeDeckStorage()): void {
  if (!status || status === "ready" || status === "failed") return;
  try {
    storage?.setItem(freeDeckBuildingStorageKey(deckId), "1");
  } catch {
    /* private mode */
  }
}

export function sawFreeDeckBuilding(deckId: string, storage: Storage | null = freeDeckStorage()): boolean {
  try {
    return storage?.getItem(freeDeckBuildingStorageKey(deckId)) === "1";
  } catch {
    return false;
  }
}

export function watchForDeck(deckId: string, storage: Storage | null = freeDeckStorage()): FreeDeckWatch {
  const watch = initialFreeDeckWatch();
  if (sawFreeDeckBuilding(deckId, storage)) watch.sawBuilding = true;
  return watch;
}

/** Returns true the first time this browser records the goal for the deck. */
export function markFreeDeckReadyTracked(deckId: string, storage: Storage | null): boolean {
  const key = freeDeckReadyStorageKey(deckId);
  try {
    if (storage?.getItem(key)) return false;
    storage?.setItem(key, "1");
  } catch {
    /* private mode: in-memory watch still prevents a repeat on this page */
  }
  return true;
}

export function trackFreeDeckReady(deckId: string, storage: Storage | null = freeDeckStorage()): void {
  if (!markFreeDeckReadyTracked(deckId, storage)) return;
  reachPkGoal(FREE_DECK_READY_GOAL);
}

function freeDeckStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}
