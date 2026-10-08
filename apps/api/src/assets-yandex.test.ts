import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { downloadYandexImageToPublic, searchYandexImages } from "./assets-yandex.js";

describe("searchYandexImages", () => {
  it("POSTs /search and maps hits", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toBe("http://images.test/search");
      expect(init?.method).toBe("POST");
      return new Response(
        JSON.stringify({
          query: "УАЗ",
          hits: [
            {
              id: "abc",
              title: "УАЗ Патриот",
              imageUrl: "https://cdn.example/a.jpg",
              thumbUrl: "https://cdn.example/a-t.jpg",
              pageUrl: "https://uaz.ru/p",
              width: 1600,
              height: 900,
              domain: "uaz.ru",
            },
          ],
        }),
        { status: 200 },
      );
    });
    const hits = await searchYandexImages({
      baseUrl: "http://images.test",
      query: "УАЗ",
      count: 3,
      orientation: "horizontal",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.domain).toBe("uaz.ru");
  });

  it("throws on non-OK", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "down" }), { status: 502 }));
    await expect(
      searchYandexImages({
        baseUrl: "http://images.test",
        query: "x",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/502|yandex-images/i);
  });
});

describe("downloadYandexImageToPublic", () => {
  it("writes bytes under public/", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "pk-yandex-"));
    const fetchImpl = vi.fn(async () => new Response(Buffer.from("JPEGDATA"), { status: 200 }));
    const result = await downloadYandexImageToPublic({
      workDir,
      url: "https://cdn.example/a.jpg",
      filename: "slide-2.jpg",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.path).toBe("/slide-2.jpg");
    expect(await readFile(join(workDir, "public", "slide-2.jpg"), "utf8")).toBe("JPEGDATA");
  });
});
