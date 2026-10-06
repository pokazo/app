import { mkdtempSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { downloadStockToPublic, safePublicPath, searchUnsplash } from "./assets-stock.js";

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
    expect(fetchMock).toHaveBeenCalled();
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
});
