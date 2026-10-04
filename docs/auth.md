# Служба авторизации клиентов

> Проверено: 2026-10-04 · источники: [Яндекс ID](https://yandex.ru/dev/id/doc/ru/), архитектура Hono, [landing.md](./landing.md)

## Вердикт

Один модуль **`auth` в том же Node/Hono-сервисе**, не Keycloak и не отдельный репозиторий. Вход: **Яндекс ID (OAuth 2.0)** как основной, **одноразовый код на email** как запасной. Сессия — httpOnly cookie. Генерация слайдов только с сессией.

**С чего начать:** приложение на [oauth.yandex.ru](https://oauth.yandex.ru/) + Better Auth на Hono.

## Почему так

| Вариант | Решение |
|---------|---------|
| Яндекс ID | Рынок Яндекса, один клик, email из профиля |
| VK ID | не MVP |
| Телефон SMS | дорого, не MVP |
| Login/password | не MVP (сброс пароля, утечки) |
| Отдельный auth-сервис | рано; граница модуля достаточна |
| Анонимная генерация | SimpleSlide так делает — у нас LLM, без учётки сожгут ключ |

## Стек

| Слой | Выбор |
|------|--------|
| Библиотека | [Better Auth](https://www.better-auth.com/) на Hono |
| OAuth Яндекс | провайдер OAuth Better Auth / Arctic `yandex` |
| Email | OTP 6 цифр, 15 мин; SMTP `mail.antonbutov.com`. В письме кнопка «Скопировать код» → `/copy-code` |
| БД пользователей | **Postgres** (не SQLite slidev-ai) |
| Сессия | cookie `pk_session`, `Secure`, `HttpOnly`, `SameSite=Lax`, 30 дней |
| CSRF | state + PKCE на OAuth; cookie same-site для API |

Регистрации как отдельной формы нет: первый успешный Яндекс/email **создаёт** `User`.

## Модель

```ts
type User = {
  id: string // ulid
  email: string
  name: string | null
  yandexId: string | null
  createdAt: Date
}

type Session = {
  id: string
  userId: string
  expiresAt: Date
}
```

Связь колод: `Deck.userId` → `User.id` (когда появится генерация).

## Потоки

**Яндекс**

1. GET `/api/auth/sign-in/yandex?next=/app&topic=…`
2. Redirect oauth.yandex.ru (`login:info` + email)
3. Callback `/api/auth/callback/yandex`
4. Upsert user по `yandexId` / email
5. Set cookie, redirect `next` (только относительный путь, иначе `/`)

**Email**

1. POST `/api/auth/email-otp/send-verification-otp` `{ email, type: "sign-in" }`
2. Письмо с кодом из 6 цифр (15 мин) и кнопкой «Скопировать код» (`/copy-code?c=`)
3. POST `/api/auth/sign-in/email-otp` `{ email, otp }`
4. Сессия как выше. Ссылку для входа не шлём.

**Выход:** POST `/api/auth/sign-out`

**Кто я:** GET `/api/auth/me` → 401 или `{ id, email, name }`

## Правила продукта

- Страницы `/login` публичные; `/app` и `POST /decks` — только сессия.
- Лендинг публичный.
- `next` и `topic` не открытый редирект: allowlist `^/[\w\-/?=&]*$`.
- Юр.: согласие на ПДн чекбоксом под кнопкой Яндекс (152-ФЗ), ссылка на политику.
- Капча не нужна на Яндекс; на email — rate limit 5 писем / час / IP.

## Границы службы

**Внутри auth:** identity, сессия, OAuth, email OTP.  
**Снаружи:** биллинг, роли admin, 2FA, привязка нескольких соцсетей.

## Не брать / оговорки

- Не светить `OPENROUTER_API_KEY` на фронте.
- Виджет «мгновенного входа» Яндекс — опционально после обычной кнопки.
- Better Auth callback URL в кабинете Яндекс: `https://pokazo.ru/api/auth/callback/yandex` (+ localhost для dev).

## История правок

| Дата | Что изменили |
|------|----------------|
| 2026-10-04 | Яндекс ID + magic link, Better Auth, cookie session |
| 2026-10-04 | Email: код вместо magic link, кнопка копирования в письме |
