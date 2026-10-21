import { Socket } from "node:net";
import type { IncomingMessage } from "node:http";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("./slidev-dev-pool.js", () => ({
  getSlidevDevSession: vi.fn(),
}));

import { getSlidevDevSession } from "./slidev-dev-pool.js";
import {
  liveDeckIdFromPath,
  tryHandleSlidevDevUpgrade,
  viteHtmlIsSlideDocument,
} from "./slidev-dev-proxy.js";

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
