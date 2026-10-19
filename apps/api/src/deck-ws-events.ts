export type DeckBuildKind =
  | "preview"
  | "progressive"
  | "final"
  | "rewrite"
  | "structure"
  | "theme";

export type DeckWsEvent =
  | { type: "hello"; deckId: string }
  | { type: "activity"; label: string; at: number }
  | { type: "build"; state: "start" | "end"; kind: DeckBuildKind; at: number }
  | { type: "status"; status: string; building: boolean; at: number };

const BUILD_LABELS = new Set([
  "Собираю превью",
  "Собираю показ",
]);

/** Labels / kinds that should show the corner build loader. */
export function isBuildPhaseLabel(label: string | null | undefined): boolean {
  const t = (label ?? "").trim();
  if (!t) return false;
  return BUILD_LABELS.has(t) || /^Собираю\b/i.test(t);
}

export function serializeDeckWsEvent(event: DeckWsEvent): string {
  return JSON.stringify(event);
}

export function parseDeckWsEvent(raw: string): DeckWsEvent | null {
  try {
    const v = JSON.parse(raw) as DeckWsEvent;
    if (!v || typeof v !== "object" || typeof (v as { type?: unknown }).type !== "string") {
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

export function activityEvent(label: string, at = Date.now()): DeckWsEvent {
  return { type: "activity", label, at };
}

export function buildEvent(
  state: "start" | "end",
  kind: DeckBuildKind,
  at = Date.now(),
): DeckWsEvent {
  return { type: "build", state, kind, at };
}
