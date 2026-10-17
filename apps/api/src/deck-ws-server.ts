import { existsSync } from "node:fs";
import type { Server } from "node:http";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { config } from "./env.js";
import { deckWsSubscribe, deckWsUnsubscribe } from "./deck-ws-hub.js";
import { serializeDeckWsEvent } from "./deck-ws-events.js";

const DECK_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function attachDeckWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    try {
      const host = req.headers.host ?? "localhost";
      const url = new URL(req.url ?? "/", `http://${host}`);
      const m = url.pathname.match(/^\/ws\/deck\/([^/]+)$/);
      if (!m) {
        socket.destroy();
        return;
      }
      const deckId = m[1];
      if (!DECK_ID_RE.test(deckId)) {
        socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      const workDir = join(config.deckDataDir, deckId);
      // Same privacy as view UUID: allow if deck workdir exists (generate/preview/ready).
      if (!existsSync(workDir)) {
        socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        deckWsSubscribe(deckId, ws);
        ws.send(serializeDeckWsEvent({ type: "hello", deckId }));
        ws.on("close", () => deckWsUnsubscribe(deckId, ws));
        ws.on("error", () => deckWsUnsubscribe(deckId, ws));
      });
    } catch {
      socket.destroy();
    }
  });

  return wss;
}
