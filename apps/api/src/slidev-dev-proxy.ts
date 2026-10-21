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

/**
 * Vite SPA fallback is `text/html` for missing files (filmstrip webp, etc.).
 * That HTML is the slide player only for a document path: no extension, `.html`, or trailing slash.
 * A real `image/*` (or any non-HTML) response is not a document — caller returns the proxy body.
 */
export function viteHtmlIsSlideDocument(pathname: string, contentType: string): boolean {
  if (!contentType.toLowerCase().includes("text/html")) return false;
  const path = (pathname.split("?")[0] ?? pathname).replace(/\/+$/, "/");
  if (path.endsWith("/")) return true;
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return true;
  return base.slice(dot).toLowerCase() === ".html";
}

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
  // Vite/Slidev binds IPv6 loopback (::1) even with --bind 127.0.0.1 in this image.
  const target = `http://[::1]:${session.port}${url.pathname}${url.search}`;
  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (k === "host" || k === "connection") return;
    headers.set(k, v);
  });
  headers.set("host", `[::1]:${session.port}`);
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

/**
 * A TCP RST (iframe reload, nginx, Vite exit) emits `error` on the raw socket.
 * With no listener Node treats that as fatal and the whole API exits — nginx then
 * answers every in-flight `/p/` request with 502.
 */
function guardSocket(socket: Duplex, onError?: () => void): void {
  socket.on("error", () => {
    try {
      onError?.();
    } catch {
      /* ignore */
    }
  });
}

/**
 * Preface bytes already pulled off each socket during the 101 handshake.
 * Vite's frames are unmasked server frames. Writing them back to Vite raises
 * `WS_ERR_EXPECTED_MASK` and the Slidev process exits, so the owner iframe
 * falls through to a pre-move `dist` while the filmstrip thumbs were remapped.
 */
export function forwardUpgradeFrames(
  client: { write(chunk: Buffer | string): void },
  upstream: { write(chunk: Buffer | string): void },
  handshake: string,
  clientHead: Buffer,
  upstreamHead: Buffer,
): void {
  client.write(handshake);
  if (clientHead.length) upstream.write(clientHead);
  if (upstreamHead.length) client.write(upstreamHead);
}

function proxyWebSocketUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  port: number,
): void {
  let upstream: Duplex | undefined;
  guardSocket(socket, () => upstream?.destroy());
  const headers = { ...req.headers, host: `[::1]:${port}` };
  const proxyReq = http.request({
    hostname: "::1",
    port,
    path: req.url,
    method: "GET",
    headers,
  });
  proxyReq.on("upgrade", (res, proxySocket, proxyHead) => {
    upstream = proxySocket;
    guardSocket(proxySocket, () => socket.destroy());
    let msg = "HTTP/1.1 101 Switching Protocols\r\n";
    for (const [k, v] of Object.entries(res.headers)) {
      if (v === undefined) continue;
      const val = Array.isArray(v) ? v.join(", ") : v;
      msg += `${k}: ${val}\r\n`;
    }
    msg += "\r\n";
    forwardUpgradeFrames(socket, proxySocket, msg, head, proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on("response", (res) => {
    res.resume();
    socket.destroy();
  });
  proxyReq.on("error", () => {
    socket.destroy();
  });
  proxyReq.end();
}

/** @returns true if claimed. */
export function tryHandleSlidevDevUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): boolean {
  guardSocket(socket);
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
