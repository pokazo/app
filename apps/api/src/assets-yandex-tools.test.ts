import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createYandexImageTools } from "./assets-yandex-tools.js";

describe("createYandexImageTools", () => {
  it("returns config error when baseUrl empty", async () => {
    const tools = createYandexImageTools("/tmp/deck", { baseUrl: "" });
    const search = tools["yandex-image-search"] as {
      execute: (args: { query: string }) => Promise<{ error?: string }>;
    };
    const out = await search.execute({ query: "УАЗ" });
    expect(out.error).toMatch(/YANDEX_IMAGES_URL/);
  });

  it("search caches hit and download writes path", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "pk-yt-"));
    const attributions: unknown[] = [];
    const tools = createYandexImageTools(workDir, {
      baseUrl: "http://images.test",
      search: async () => [
        {
          id: "h1",
          title: "УАЗ Патриот",
          imageUrl: "https://cdn.example/a.jpg",
          thumbUrl: "https://cdn.example/t.jpg",
          pageUrl: "https://uaz.ru/p",
          width: 1600,
          height: 900,
          domain: "uaz.ru",
        },
      ],
      download: async ({ filename }) => ({
        path: `/${filename}`,
        file: join(workDir, "public", filename),
      }),
      onAttribution: (e) => attributions.push(e),
    });
    const search = tools["yandex-image-search"] as {
      execute: (a: { query: string }) => Promise<Array<{ id: string; title: string }>>;
    };
    const hits = await search.execute({ query: "УАЗ Патриот" });
    expect(hits[0]?.id).toBe("h1");
    const dl = tools["yandex-image-download"] as {
      execute: (a: {
        id: string;
        filename: string;
      }) => Promise<{ path: string; source: string }>;
    };
    const out = await dl.execute({ id: "h1", filename: "slide-2.jpg" });
    expect(out.path).toBe("/slide-2.jpg");
    expect(out.source).toBe("yandex");
    expect(attributions[0]).toMatchObject({ source: "yandex", pageUrl: "https://uaz.ru/p" });
  });
});
