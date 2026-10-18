import { useEffect, useRef, useState } from "react";
import {
  deckWsUrl,
  isBuildPhaseLabel,
  parseDeckWsEvent,
  type DeckBuildKind,
  type DeckWsEvent,
} from "./deck-ws";

export type DeckSocketState = {
  connected: boolean;
  activity: string | null;
  buildLive: boolean;
  buildKind: DeckBuildKind | null;
};

const INITIAL: DeckSocketState = {
  connected: false,
  activity: null,
  buildLive: false,
  buildKind: null,
};

/**
 * Live deck events over `/ws/deck/:id`. Reconnects with backoff; safe no-op if
 * the server is down — HTTP poll remains the source of truth for meta.
 */
export function useDeckSocket(deckId: string | undefined, enabled = true): DeckSocketState {
  const [state, setState] = useState<DeckSocketState>(INITIAL);
  const backoffRef = useRef(800);

  useEffect(() => {
    if (!enabled || !deckId) {
      setState(INITIAL);
      return;
    }

    let closed = false;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const apply = (event: DeckWsEvent) => {
      setState((prev) => {
        if (event.type === "hello") {
          return { ...prev, connected: true };
        }
        if (event.type === "activity") {
          return { ...prev, activity: event.label };
        }
        if (event.type === "build") {
          if (event.state === "start") {
            return { ...prev, buildLive: true, buildKind: event.kind };
          }
          // Drop stale «Собираю показ» so the loader does not stick after build end.
          const activity =
            prev.activity && isBuildPhaseLabel(prev.activity) ? null : prev.activity;
          return { ...prev, buildLive: false, buildKind: null, activity };
        }
        return prev;
      });
    };

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(deckWsUrl(deckId));
      } catch {
        scheduleReconnect();
        return;
      }
      ws.onopen = () => {
        backoffRef.current = 800;
        setState((prev) => ({ ...prev, connected: true }));
      };
      ws.onmessage = (ev) => {
        if (typeof ev.data !== "string") return;
        const event = parseDeckWsEvent(ev.data);
        if (event) apply(event);
      };
      ws.onclose = () => {
        setState((prev) => ({ ...prev, connected: false, buildLive: false }));
        scheduleReconnect();
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
      };
    };

    const scheduleReconnect = () => {
      if (closed) return;
      const wait = backoffRef.current;
      backoffRef.current = Math.min(12_000, Math.round(wait * 1.6));
      timer = setTimeout(connect, wait);
    };

    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, [deckId, enabled]);

  return state;
}
