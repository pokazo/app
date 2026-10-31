/** Carry create-form topic across landing → login → /app (incl. OAuth). */

import { TOPIC_MAX_CHARS } from "./topic-limits";

const STORAGE_KEY = "pokazo:pending-topic";

let memoryTopic = "";
let hydratedFromSession = false;

function hydrateFromSession(): void {
  if (hydratedFromSession || memoryTopic) return;
  hydratedFromSession = true;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (typeof raw === "string") memoryTopic = raw.slice(0, TOPIC_MAX_CHARS);
  } catch {
    memoryTopic = "";
  }
}

export function stashPendingTopic(topic: string): void {
  memoryTopic = topic.trim().slice(0, TOPIC_MAX_CHARS);
  hydratedFromSession = true;
  try {
    if (memoryTopic) sessionStorage.setItem(STORAGE_KEY, memoryTopic);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Quota / private mode — in-memory still covers SPA navigations.
  }
}

/** Non-destructive read (safe under React Strict Mode remount). */
export function getPendingTopic(): string {
  hydrateFromSession();
  return memoryTopic;
}

/** Call once create has consumed the topic. */
export function clearPendingTopic(): void {
  memoryTopic = "";
  hydratedFromSession = true;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
