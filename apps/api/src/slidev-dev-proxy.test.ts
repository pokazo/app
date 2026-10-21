import { Socket } from "node:net";
import type { IncomingMessage } from "node:http";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("./slidev-dev-pool.js", () => ({
  getSlidevDevSession: vi.fn(),
}));

import { getSlidevDevSession } from "./slidev-dev-pool.js";
import {
  forwardUpgradeFrames,
  liveDeckIdFromPath,
  requestWantsStaticPlayer,
  shouldProxyDeckToLive,
  tryHandleSlidevDevUpgrade,
  viteHtmlIsSlideDocument,
} from "./slidev-dev-proxy.js";

describe("static player vs live proxy", () => {
  it("detects pkStatic on the viewer iframe", () => {
    expect(requestWantsStaticPlayer("?embedded&pkStatic=1")).toBe(true);
    expect(requestWantsStaticPlayer("embedded")).toBe(false);
    expect(requestWantsStaticPlayer("?embedded=true")).toBe(false);
  });

  it("does not proxy a refresh onto the Vite dev graph", () => {
    expect(shouldProxyDeckToLive({ pkStatic: true, owner: true, live: true })).toBe(false);
    expect(shouldProxyDeckToLive({ pkStatic: false, owner: true, live: true })).toBe(true);
    expect(shouldProxyDeckToLive({ pkStatic: false, owner: false, live: true })).toBe(false);
    expect(shouldProxyDeckToLive({ pkStatic: false, owner: true, live: false })).toBe(false);
  });
});

describe("liveDeckIdFromPath", () => {
  beforeEach(() => {
    vi.mocked(getSlidevDevSession).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns deck id when live session exists", () => {
    const id = "bed0ddd0-7520-4a71-b0e7-21d899a7143a";
    vi.mocked(getSlidevDevSession).mockReturnValue({
      deckId: id,
      workDir: "/tmp",
      port: 39111,
      child: {} as never,
      lastUsedAt: Date.now(),
      ready: true,
    });
    expect(liveDeckIdFromPath(`/p/${id}/2`)).toBe(id);
    expect(liveDeckIdFromPath(`/p/${id}/`)).toBe(id);
  });

  it("returns undefined without live session", () => {
    const id = "bed0ddd0-7520-4a71-b0e7-21d899a7143a";
    vi.mocked(getSlidevDevSession).mockReturnValue(undefined);
    expect(liveDeckIdFromPath(`/p/${id}/`)).toBeUndefined();
  });

  it("ignores non-uuid paths", () => {
    expect(liveDeckIdFromPath("/p/not-a-uuid/")).toBeUndefined();
    expect(liveDeckIdFromPath("/ws/deck/x")).toBeUndefined();
  });
});

describe("viteHtmlIsSlideDocument", () => {
  it("treats a filmstrip webp answered as HTML as a file, not the player", () => {
    expect(viteHtmlIsSlideDocument("/thumbs/v2/1.webp", "text/html")).toBe(false);
    expect(
      viteHtmlIsSlideDocument(
        "/p/bed0ddd0-7520-4a71-b0e7-21d899a7143a/thumbs/v2/1.webp",
        "text/html; charset=utf-8",
      ),
    ).toBe(false);
  });

  it("treats / and index.html as the slide document", () => {
    expect(viteHtmlIsSlideDocument("/", "text/html")).toBe(true);
    expect(viteHtmlIsSlideDocument("/index.html", "text/html; charset=utf-8")).toBe(true);
    expect(
      viteHtmlIsSlideDocument("/p/bed0ddd0-7520-4a71-b0e7-21d899a7143a/", "text/html"),
    ).toBe(true);
  });

  it("keeps a real image response off the document path", () => {
    expect(viteHtmlIsSlideDocument("/thumbs/v2/1.webp", "image/webp")).toBe(false);
    expect(viteHtmlIsSlideDocument("/slide-1.jpg", "image/jpeg")).toBe(false);
  });
});

describe("forwardUpgradeFrames", () => {
  it("sends Vite's preface to the browser and the browser preface to Vite", () => {
    const client: Array<Buffer | string> = [];
    const upstream: Array<Buffer | string> = [];
    const clientHead = Buffer.from("masked-client");
    const upstreamHead = Buffer.from("unmasked-server");
    forwardUpgradeFrames(
      { write: (chunk) => client.push(chunk) },
      { write: (chunk) => upstream.push(chunk) },
      "HTTP/1.1 101 Switching Protocols\r\n\r\n",
      clientHead,
      upstreamHead,
    );
    expect(client[0]).toContain("101");
    expect(client[1]).toBe(upstreamHead);
    expect(upstream).toEqual([clientHead]);
  });
});

describe("tryHandleSlidevDevUpgrade", () => {
  const id = "bed0ddd0-7520-4a71-b0e7-21d899a7143a";

  beforeEach(() => {
    vi.mocked(getSlidevDevSession).mockReset();
  });

  it("swallows ECONNRESET on the client socket instead of killing the process", () => {
    vi.mocked(getSlidevDevSession).mockReturnValue({
      deckId: id,
      workDir: "/tmp",
      port: 1,
      child: { exitCode: null } as never,
      lastUsedAt: Date.now(),
      ready: true,
    });
    const socket = new Socket();
    const req = {
      url: `/p/${id}/`,
      headers: { host: "api.pokazo.ru" },
    } as IncomingMessage;
    const unhandled: Error[] = [];
    const onUnhandled = (err: Error) => {
      unhandled.push(err);
    };
    process.on("uncaughtException", onUnhandled);
    try {
      expect(tryHandleSlidevDevUpgrade(req, socket, Buffer.alloc(0))).toBe(true);
      const reset = Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" });
      expect(() => socket.emit("error", reset)).not.toThrow();
    } finally {
      process.off("uncaughtException", onUnhandled);
      socket.destroy();
    }
    expect(unhandled).toEqual([]);
  });
});
