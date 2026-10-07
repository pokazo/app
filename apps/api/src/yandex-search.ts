import { domainToUnicode } from "node:url";

export const YANDEX_SEARCH_API_URL = "https://searchapi.api.cloud.yandex.net/v2/web/search";

export type YandexSearchHit = {
  position: number;
  url: string;
  domain: string;
  title: string;
  headline?: string;
  passages?: string[];
  snippet: string;
  size?: number;
  lang?: string;
  cachedUrl?: string;
  image?: string;
};

export type YandexSearchOptions = {
  apiKey: string;
  folderId: string;
  query: string;
  maxResults?: number;
  includeImages?: boolean;
  region?: number;
  page?: number;
  familyMode?: "FAMILY_MODE_NONE" | "FAMILY_MODE_MODERATE" | "FAMILY_MODE_STRICT";
  apiUrl?: string;
  fetchImpl?: typeof fetch;
};

function detectLanguage(text: string): "ru" | "en" {
  return /[\u0400-\u04FF]/.test(text) ? "ru" : "en";
}

function cleanText(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toDisplayHost(host: string): string {
  if (!host || !/xn--/i.test(host)) return host;
  try {
    return domainToUnicode(host) || host;
  } catch {
    return host;
  }
}

function toDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const display = toDisplayHost(parsed.hostname);
    if (display === parsed.hostname) return url;
    const idx = url.toLowerCase().indexOf(parsed.hostname);
    return idx === -1 ? url : url.slice(0, idx) + display + url.slice(idx + parsed.hostname.length);
  } catch {
    return url;
  }
}

function extractDomain(url: string): string {
  try {
    return toDisplayHost(new URL(url).hostname);
  } catch {
    const match = url.match(/^(?:https?:\/\/)?([^/?#]+)/i);
    return toDisplayHost(match?.[1] || "");
  }
}

/** Parse Yandex Search API XML payload (decoded from rawData). Exported for tests. */
export function parseYandexXmlResults(xmlData: string, includeImages = false): YandexSearchHit[] {
  const results: YandexSearchHit[] = [];
  const groupMatches = xmlData.matchAll(/<group>([\s\S]*?)<\/group>/g);

  let position = 0;
  for (const groupMatch of groupMatches) {
    const groupContent = groupMatch?.[1];
    if (!groupContent) continue;

    const docMatch = groupContent.match(/<doc[^>]*>([\s\S]*?)<\/doc>/);
    const docContent = docMatch?.[1];
    if (!docContent) continue;

    const urlMatch = docContent.match(/<url>([^<]+)<\/url>/);
    if (!urlMatch?.[1]) continue;

    position++;
    const url = urlMatch[1];

    const titleMatch = docContent.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch?.[1] ? cleanText(titleMatch[1]) : "No title";

    const headlineMatch = docContent.match(/<headline>([\s\S]*?)<\/headline>/);
    const headline = headlineMatch?.[1] ? cleanText(headlineMatch[1]) : undefined;

    const passages: string[] = [];
    const passagesMatch = docContent.match(/<passages>([\s\S]*?)<\/passages>/);
    if (passagesMatch?.[1]) {
      const passageMatches = passagesMatch[1].matchAll(/<passage>([\s\S]*?)<\/passage>/g);
      for (const match of passageMatches) {
        if (match[1]) passages.push(cleanText(match[1]));
      }
    }

    const snippet = passages.length > 0 ? passages.join(" ") : headline || "";

    const sizeMatch = docContent.match(/<size>(\d+)<\/size>/);
    const size = sizeMatch?.[1] ? Number.parseInt(sizeMatch[1], 10) : undefined;

    const langMatch = docContent.match(/<lang>([^<]+)<\/lang>/);
    const lang = langMatch?.[1] || undefined;

    const cachedUrlMatch = docContent.match(/<saved-copy-url>([^<]+)<\/saved-copy-url>/);
    const cachedUrl = cachedUrlMatch?.[1] || undefined;

    const result: YandexSearchHit = {
      position,
      url: toDisplayUrl(url),
      domain: extractDomain(url),
      title,
      headline,
      passages: passages.length > 0 ? passages : undefined,
      snippet: snippet || "No content available",
      size,
      lang,
      cachedUrl,
    };

    if (includeImages) {
      const imgMatch =
        groupContent.match(/<img[^>]*src="([^"]+)"/i) ||
        groupContent.match(/<image>([^<]+)<\/image>/i) ||
        groupContent.match(/<thumb>([^<]+)<\/thumb>/i);
      if (imgMatch?.[1]) result.image = imgMatch[1];
    }

    results.push(result);
  }

  return results;
}

export async function searchYandex(opts: YandexSearchOptions): Promise<YandexSearchHit[]> {
  const maxResults = opts.maxResults ?? 10;
  const includeImages = opts.includeImages ?? false;
  const language = detectLanguage(opts.query);
  const searchType = language === "ru" ? "SEARCH_TYPE_RU" : "SEARCH_TYPE_COM";
  const l10n = language === "ru" ? "LOCALIZATION_RU" : "LOCALIZATION_EN";
  const fetchImpl = opts.fetchImpl ?? fetch;

  const requestBody: Record<string, unknown> = {
    query: {
      searchType,
      queryText: opts.query,
      familyMode: opts.familyMode ?? "FAMILY_MODE_MODERATE",
      page: String(opts.page ?? 0),
      fixTypoMode: "FIX_TYPO_MODE_ON",
    },
    sortSpec: {
      sortMode: "SORT_MODE_BY_RELEVANCE",
      sortOrder: "SORT_ORDER_DESC",
    },
    groupSpec: {
      groupMode: "GROUP_MODE_DEEP",
      groupsOnPage: String(maxResults),
      docsInGroup: "1",
    },
    folderId: opts.folderId,
    responseFormat: "FORMAT_XML",
    l10n,
  };

  if (opts.region != null) {
    requestBody.region = String(opts.region);
  }

  const response = await fetchImpl(opts.apiUrl ?? YANDEX_SEARCH_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Api-Key ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Yandex Search API error (${response.status}): ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText) as { message?: string };
      if (errorJson.message) errorMessage = errorJson.message;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as { rawData?: string };
  if (!data.rawData) {
    throw new Error("Yandex Search API: missing rawData in response");
  }
  const xmlData = Buffer.from(data.rawData, "base64").toString("utf-8");
  return parseYandexXmlResults(xmlData, includeImages).slice(0, maxResults);
}
