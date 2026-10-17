import { apiUrl } from "./api";

export type DeckBuildKind = "preview" | "progressive" | "final" | "rewrite" | "structure";

export type DeckWsEvent =
  | { type: "hello"; deckId: string }
  | { type: "activity"; label: string; at: number }
  | { type: "build"; state: "start" | "end"; kind: DeckBuildKind; at: number }
  | { type: "status"; status: string; building: boolean; at?: number };

const BUILD_LABELS = new Set(["Собираю превью", "Собираю показ"]);

export function isBuildPhaseLabel(label: string | null | undefined): boolean {
  const t = (label ?? "").trim();
  if (!t) return false;
  return BUILD_LABELS.has(t) || /^Собираю\b/i.test(t);
}

/** Whether the corner build loader should be visible. */
export function shouldShowBuildLoader(opts: {
  buildLive: boolean;
  activity?: string | null;
}): boolean {
  if (opts.buildLive) return true;
  return isBuildPhaseLabel(opts.activity);
}

export function deckWsUrl(deckId: string): string {
  const http = apiUrl(`/ws/deck/${deckId}`);
  if (http.startsWith("https://")) return `wss://${http.slice("https://".length)}`;
  if (http.startsWith("http://")) return `ws://${http.slice("http://".length)}`;
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${http.startsWith("/") ? http : `/${http}`}`;
  }
  return http.replace(/^http/, "ws");
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
