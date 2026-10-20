/**
 * Proxy HTTP + WebSocket to a live Slidev (Vite) process for owner preview.
 * Guests keep static /p/:id/ dist.
 */
import http from "node:http";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { getSlidevDevSession } from "./slidev-dev-pool.js";

const DECK_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Path is under /p/:uuid/ (or bare /p/:uuid) for a live session. */
export function liveDeckIdFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/p\/([0-9a-f-]{36})(?:\/|$)/i);
  if (!m || !DECK_ID_RE.test(m[1])) return undefined;
  if (!getSlidevDevSession(m[1])) return undefined;
  return m[1];
}

export async function proxyHttpToSlidevDev(
  req: Request,
  deckId: string,
): Promise<Response | null> {
  const session = getSlidevDevSession(deckId);
  if (!session) return null;
  const url = new URL(req.url);
  const target = `http://127.0.0.1:${session.port}${url.pathname}${url.search}`;
  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (k === "host" || k === "connection") return;
    headers.set(k, v);
  });
  headers.set("host", `127.0.0.1:${session.port}`);
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      redirect: "manual",
    });
    const out = new Headers(upstream.headers);
    out.set("cache-control", "no-store");
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (err) {
    console.warn(`[slidev-dev] proxy http fail deck=${deckId}: ${String(err).slice(0, 200)}`);
    return null;
  }
}

function proxyWebSocketUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  port: number,
): void {
  const headers = { ...req.headers, host: `127.0.0.1:${port}` };
  const proxyReq = http.request({
    hostname: "127.0.0.1",
    port,
    path: req.url,
    method: "GET",
    headers,
  });
  proxyReq.on("upgrade", (res, proxySocket, proxyHead) => {
    let msg = "HTTP/1.1 101 Switching Protocols\r\n";
    for (const [k, v] of Object.entries(res.headers)) {
      if (v === undefined) continue;
      const val = Array.isArray(v) ? v.join(", ") : v;
      msg += `${k}: ${val}\r\n`;
    }
    msg += "\r\n";
    socket.write(msg);
    if (proxyHead?.length) proxySocket.write(proxyHead);
    if (head?.length) proxySocket.write(head);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on("error", () => {
    try {
      socket.destroy();
    } catch {
      /* ignore */
    }
  });
  proxyReq.end();
}

/** @returns true if claimed. */
export function tryHandleSlidevDevUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): boolean {
  try {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    const deckId = liveDeckIdFromPath(url.pathname);
    if (!deckId) return false;
    const session = getSlidevDevSession(deckId);
    if (!session) {
      socket.destroy();
      return true;
    }
    proxyWebSocketUpgrade(req, socket, head, session.port);
    return true;
  } catch {
    socket.destroy();
    return true;
  }
}
