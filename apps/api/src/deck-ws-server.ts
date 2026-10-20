import { existsSync } from "node:fs";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { config } from "./env.js";
import { deckWsSubscribe, deckWsUnsubscribe } from "./deck-ws-hub.js";
import { serializeDeckWsEvent } from "./deck-ws-events.js";

const DECK_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let wss: WebSocketServer | undefined;

/** @returns true if this upgrade was claimed (success or error response). */
export function tryHandleDeckWsUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): boolean {
  if (!wss) return false;
  try {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    const m = url.pathname.match(/^\/ws\/deck\/([^/]+)$/);
    if (!m) return false;
    const deckId = m[1];
    if (!DECK_ID_RE.test(deckId)) {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return true;
    }
    const workDir = join(config.deckDataDir, deckId);
    // Same privacy as view UUID: allow if deck workdir exists (generate/preview/ready).
    if (!existsSync(workDir)) {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return true;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      deckWsSubscribe(deckId, ws);
      ws.send(serializeDeckWsEvent({ type: "hello", deckId }));
      ws.on("close", () => deckWsUnsubscribe(deckId, ws));
      ws.on("error", () => deckWsUnsubscribe(deckId, ws));
    });
    return true;
  } catch {
    socket.destroy();
    return true;
  }
}

export function attachDeckWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });
  return wss;
}
