import { describe, expect, it, vi } from "vitest";
import { parseYandexXmlResults, searchYandex } from "./yandex-search.js";

const SAMPLE_XML = `<?xml version="1.0"?>
<yandexsearch>
  <response>
    <results>
      <grouping>
        <group>
          <doc>
            <url>https://example.com/uaz</url>
            <title>УАЗ &lt;hlword&gt;Патриот&lt;/hlword&gt;</title>
            <headline>Обзор внедорожника</headline>
            <passages>
              <passage>Мощность 150 л.с.</passage>
              <passage>Цена от 1.5 млн</passage>
            </passages>
            <size>1234</size>
            <lang>ru</lang>
            <saved-copy-url>https://yandex.ru/cached</saved-copy-url>
          </doc>
        </group>
        <group>
          <doc>
            <url>https://xn--d1abiacj6ales3d1b.xn--p1ai/page</url>
            <title>Другой сайт</title>
          </doc>
        </group>
      </grouping>
    </results>
  </response>
</yandexsearch>`;

describe("parseYandexXmlResults", () => {
  it("extracts title, passages, snippet, and domain", () => {
    const hits = parseYandexXmlResults(SAMPLE_XML);
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({
      position: 1,
      url: "https://example.com/uaz",
      domain: "example.com",
      title: "УАЗ Патриот",
      headline: "Обзор внедорожника",
      snippet: "Мощность 150 л.с. Цена от 1.5 млн",
      size: 1234,
      lang: "ru",
      cachedUrl: "https://yandex.ru/cached",
    });
    expect(hits[0].passages).toEqual(["Мощность 150 л.с.", "Цена от 1.5 млн"]);
  });

  it("decodes punycode host for display", () => {
    const hits = parseYandexXmlResults(SAMPLE_XML);
    expect(hits[1].domain).toMatch(/[а-яё]/i);
    expect(hits[1].url).toContain("://");
  });
});

describe("searchYandex", () => {
  it("POSTs to Search API and parses base64 XML", async () => {
    const rawData = Buffer.from(SAMPLE_XML, "utf-8").toString("base64");
    const fetchImpl = vi.fn(async () =>
      Response.json({ rawData }, { status: 200 }),
    ) as unknown as typeof fetch;

    const hits = await searchYandex({
      apiKey: "key",
      folderId: "folder",
      query: "УАЗ Патриот",
      maxResults: 5,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("searchapi.api.cloud.yandex.net");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Api-Key key" });
    const body = JSON.parse(String(init.body)) as { query: { queryText: string }; folderId: string };
    expect(body.query.queryText).toBe("УАЗ Патриот");
    expect(body.folderId).toBe("folder");
    expect(hits[0].title).toBe("УАЗ Патриот");
  });

  it("throws on API error", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ message: "quota exceeded" }), { status: 429 }),
    ) as unknown as typeof fetch;

    await expect(
      searchYandex({
        apiKey: "key",
        folderId: "folder",
        query: "test",
        fetchImpl,
      }),
    ).rejects.toThrow(/quota exceeded/);
  });
});
