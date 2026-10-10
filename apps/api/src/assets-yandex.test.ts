import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  downloadYandexImageToPublic,
  enrichYandexHit,
  searchYandexImages,
  suggestYandexDownloadId,
} from "./assets-yandex.js";

describe("enrichYandexHit", () => {
  it("keeps non-empty title", () => {
    const hit = enrichYandexHit({
      id: "1",
      title: "УАЗ Патриот",
      imageUrl: "https://cdn.example/a.jpg",
      thumbUrl: "https://cdn.example/t.jpg",
      pageUrl: "https://uaz.ru/patriot",
      width: 100,
      height: 100,
      domain: "uaz.ru",
    });
    expect(hit.title).toBe("УАЗ Патриот");
  });

  it("fills empty title from pageUrl path + domain", () => {
    const hit = enrichYandexHit({
      id: "2",
      title: "",
      imageUrl: "https://storage.rentride.ru/cars/1.jpg",
      thumbUrl: "https://cdn.example/t.jpg",
      pageUrl: "https://rentride.ru/cars/507189/?regions=77",
      width: 100,
      height: 100,
      domain: "storage.rentride.ru",
    });
    expect(hit.title).toMatch(/rentride|cars|507189/i);
    expect(hit.title.length).toBeGreaterThan(3);
  });
});

describe("suggestYandexDownloadId", () => {
  it("prefers topical site domain over yandex CDN", () => {
    const id = suggestYandexDownloadId([
      {
        id: "cdn",
        title: "cdn",
        imageUrl: "https://avatars.mds.yandex.net/x.jpg",
        thumbUrl: "https://avatars.mds.yandex.net/t.jpg",
        pageUrl: "https://yandex.ru/images",
        width: 100,
        height: 100,
        domain: "avatars.mds.yandex.net",
      },
      {
        id: "good",
        title: "cars 507189 — rentride.ru",
        imageUrl: "https://storage.rentride.ru/a.jpg",
        thumbUrl: "https://cdn.example/t.jpg",
        pageUrl: "https://rentride.ru/cars/507189/",
        width: 100,
        height: 100,
        domain: "storage.rentride.ru",
      },
    ]);
    expect(id).toBe("good");
  });
});

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

  it("enriches empty titles from pageUrl", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            hits: [
              {
                id: "empty",
                title: "",
                imageUrl: "https://irenter.ru/cars/a.jpg",
                thumbUrl: "https://cdn.example/t.jpg",
                pageUrl: "https://irenter.ru/msk/bmw-540i-black/",
                width: 100,
                height: 100,
                domain: "irenter.ru",
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const hits = await searchYandexImages({
      baseUrl: "http://images.test",
      query: "аренда",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(hits[0]?.title).toMatch(/irenter|bmw|540i/i);
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
