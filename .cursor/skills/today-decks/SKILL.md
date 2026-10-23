---
name: today-decks
description: >-
  Кто делал презентации на pokazo.ru за сегодня (prod Postgres) и какую ссылку
  отдавать. Ссылка только https://pokazo.ru/view/{id}. Триггер: кто сегодня
  делал презентации, покажи резалтс, ссылка на колоду, today-decks, /today-decks.
---

# Колоды за сегодня

Триггеры: «кто сегодня делал презентации», «кроме меня», «покажи резалтс», «дай ссылку», `/today-decks`.

## Ссылка

Открывать колоду только так:

`https://pokazo.ru/view/{id}`

Пример: `https://pokazo.ru/view/f4f6654e-fc5f-4439-89b3-5130c015cb8e`

Не давать `https://api.pokazo.ru/p/{id}/`, `?embedded` и голый `/p/{id}/1`.

Ссылку давать только если `status` = `ready` или `preview`. Иначе назвать статус и не подставлять `/view`.

## Кто делал сегодня

1. Запусти скрипт из корня репозитория:

```bash
bash .cursor/skills/today-decks/scripts/today-decks.sh
# «кроме меня» — без butov6101@mail.ru и mail@antonbutov.com:
bash .cursor/skills/today-decks/scripts/today-decks.sh --except-me
```

2. День — календарный **Europe/Moscow**. `deck.created_at` в Postgres лежит как UTC без таймзоны.
3. В ответе: email, время МСК, тема, статус и колонка `view`. Не вставляй SQL и пароли.

Хост `root@80.87.196.33`, контейнер `pokazo-postgres-1`, база `pokazo`. Если SSH недоступен — скажи об этом, локальную БД не подставляй.
