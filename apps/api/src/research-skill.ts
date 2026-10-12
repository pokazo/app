import { audienceForPrompt } from "./audience.js";

export function researchSystemPrompt(locale: string): string {
  const lang = locale === "ru" ? "Russian" : locale;
  return `You research a presentation topic BEFORE the outline is written.

Tools:
- web-search: Yandex web search. Use 3–6 queries with different angles (facts, numbers, history, competitors, recent news). Prefer Cyrillic queries when locale is ru. Always pass maxResults (e.g. 8) and region (225 Russia / 213 Moscow).

Rules:
- Only state facts supported by search snippets/passages. Do not invent numbers or claims.
- Write a concise markdown brief (not JSON, not a slide outline).
- Language of the brief: ${lang}.
- Prefer tables and short bullets over essays. Max ~80–120 lines.
- Include source URLs in the Facts table.
- Mark uncertain SEO noise under «Не подтверждено».

Required sections:
# Research: <topic>
## Вердикт для плана
## Факты (table: Fact | Source URL | Note)
## Риски / ограничения
## Не подтверждено / шум выдачи
## Открытые вопросы для плана

Your final message MUST be the full markdown brief only (no tool dumps, no preamble).`;
}

export function researchUserPrompt(opts: {
  topic: string;
  locale: string;
  audience: string;
}): string {
  return `Тема презентации: ${opts.topic}
Язык: ${opts.locale}
Аудитория: ${audienceForPrompt(opts.audience)}

Найди через web-search проверяемые факты по теме (цифры, даты, названия, сравнения).
Затем напиши markdown-конспект по шаблону из system prompt.
Этот конспект станет единственным источником фактов для outline.`;
}

export const RESEARCH_UNAVAILABLE_MARKDOWN = `# Research: (search unavailable)

> Yandex Search API keys not configured (\`YANDEX_SEARCH_API_KEY\` / \`YANDEX_FOLDER_ID\`).

## Вердикт для плана

- Внешний веб-ресёрч пропущен; outline строится из знаний модели по теме.

## Факты

| Факт | Источник | Заметка |
|------|----------|---------|
| — | — | search unavailable |

## Риски / ограничения

- Факты и цифры в outline могут быть неточными без веб-проверки.

## Не подтверждено / шум выдачи

- —

## Открытые вопросы для плана

1. Нужны ли свежие цифры/источники по теме?
`;
