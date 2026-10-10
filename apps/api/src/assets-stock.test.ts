import { mkdtempSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  UNSPLASH_SEARCH_TIMEOUT_MS,
  downloadStockToPublic,
  safePublicPath,
  searchUnsplash,
} from "./assets-stock.js";

describe("safePublicPath", () => {
  it("rejects path traversal", () => {
    const root = "/tmp/deck";
    expect(() => safePublicPath(root, "../etc/passwd")).toThrow(/unsafe/i);
    expect(() => safePublicPath(root, "/abs.jpg")).toThrow(/unsafe/i);
  });

  it("accepts a simple basename under public/", () => {
    expect(safePublicPath("/tmp/deck", "hero.jpg")).toBe(join("/tmp/deck", "public", "hero.jpg"));
  });
});

describe("searchUnsplash", () => {
  it("uses a short AbortSignal timeout (fail-fast)", async () => {
    expect(UNSPLASH_SEARCH_TIMEOUT_MS).toBeLessThanOrEqual(8_000);
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeDefined();
      expect(init?.signal?.aborted).toBe(false);
      return Response.json({ results: [] });
    });
    await searchUnsplash({
      accessKey: "key",
      query: "car",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("returns mapped results from Unsplash JSON", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        results: [
          {
            id: "abc",
            urls: { raw: "https://images.unsplash.com/photo-1", regular: "https://images.unsplash.com/photo-1?w=1080" },
            width: 4000,
            height: 3000,
            user: { name: "Ada", links: { html: "https://unsplash.com/@ada" } },
          },
        ],
      }),
    );
    const hits = await searchUnsplash({
      accessKey: "key",
      query: "office atrium",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe("abc");
    expect(hits[0]?.photographer).toBe("Ada");
    expect(hits[0]?.description).toBe("");
    expect(hits[0]?.altDescription).toBe("");
    const url = String(fetchMock.mock.calls.at(0)?.[0] ?? "");
    expect(url).toContain("https://api.unsplash.com/search/photos");
    expect(url).toContain("query=office+atrium");
  });

  it("maps description and alt_description for relevance judgment", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        results: [
          {
            id: "car1",
            description: "Red Hyundai Santa Fe parked outdoors",
            alt_description: "modern suv front three-quarter view",
            urls: { raw: "https://images.unsplash.com/photo-car" },
            width: 1600,
            height: 1067,
            user: { name: "Bob", links: { html: "https://unsplash.com/@bob" } },
          },
        ],
      }),
    );
    const hits = await searchUnsplash({
      accessKey: "key",
      query: "UAZ Patriot SUV",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(hits[0]?.description).toBe("Red Hyundai Santa Fe parked outdoors");
    expect(hits[0]?.altDescription).toBe("modern suv front three-quarter view");
  });

  it("uses apiBase for search URL", async () => {
    const fetchMock = vi.fn(async () => Response.json({ results: [] }));
    await searchUnsplash({
      accessKey: "key",
      query: "desk",
      apiBase: "http://egress:8788",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(String(fetchMock.mock.calls.at(0)?.[0] ?? "")).toMatch(/^http:\/\/egress:8788\/search\/photos\?/);
  });
});

describe("downloadStockToPublic", () => {
  it("writes bytes under workDir/public and returns web path", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "pokazo-stock-"));
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }));
    const result = await downloadStockToPublic({
      workDir,
      url: "https://images.unsplash.com/photo-1",
      filename: "slide-2.jpg",
      attribution: { photographer: "Ada", attributionUrl: "https://unsplash.com/@ada" },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(result.path).toBe("/slide-2.jpg");
    const bytes = await readFile(join(workDir, "public", "slide-2.jpg"));
    expect([...bytes]).toEqual([1, 2, 3, 4]);
  });

  it("rewrites images.unsplash.com through imagesBase", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "pokazo-stock-"));
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1]), { status: 200 }));
    await downloadStockToPublic({
      workDir,
      url: "https://images.unsplash.com/photo-1?w=1600",
      filename: "a.jpg",
      attribution: { photographer: "Ada", attributionUrl: "https://unsplash.com/@ada" },
      imagesBase: "http://egress:8789",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(String(fetchMock.mock.calls.at(0)?.[0] ?? "")).toBe("http://egress:8789/photo-1?w=1600");
  });
});
