# Design: Оплаты (Точка) — кредиты / пакеты

> Дата: 2026-10-12 · статус: approved · бренд: Pokazo  
> Референсы: Сократик, Slidy, Gamma, Госфото (`gosphoto-api` + Точка)

## Проблема

Сервис бесплатен без лимита → LLM/картинки сжигают бюджет. Оферта и ПДн — заглушки «до запуска оплаты». Нужен приём денег в РФ через уже рабочий для ИП канал — **интернет-эквайринг Точки** (как на gosphoto.ru).

## Цель

1. Пользователь получает **aha** без карты (1 полная колода после логина).
2. Со 2-й колоды — оплата через **Точку** (платёжная ссылка + webhook).
3. Рядом — **месячный безлимит** разовой ссылкой (рекуррент Точки — этап 2).
4. Юридически: живые оферта/ПДн + чек 54-ФЗ (фискализация через партнёра Точки / как на Госфото).

## Не в скоупе (v1)

- Рекуррентные автосписания Точки (подписки API) — v2
- Командные места / школьные лицензии
- ЮKassa / CloudPayments / Stripe
- Paywall только на PDF/PPTX при бесплатной полной веб-ссылке (ядро Показо — веб)
- Водяной знак на слайдах как единственный gate
- Недельный тариф «как Slidy 899 ₽»

## Решение (вердикт)

**Модель продукта (как Сократик + unit-pay Госфото):**

| Ступень | Цена | Что даёт |
|---------|------|----------|
| Free | 0 ₽ | После логина: **1** успешная генерация колоды (плеер + публичная ссылка + PDF/PPTX как сейчас) |
| Разово | **199 ₽** | **+1** генерация (кредит на колоду) |
| Месяц | **399 ₽** | Безлимит генераций на **30 суток** с момента оплаты |

Цены — стартовые якоря (Сokratic ~149/469, Slidy ~199); крутим env без релиза.

**Шлюз:** Точка интернет-эквайринг (`enter.tochka.com`), паттерн **gosphoto-api**:

```text
user нажимает «Создать» / «Купить ещё»
  → если free quota / active month / credits > 0 → enqueue generate
  → иначе POST /api/billing/checkout { product }
  → Tochka payment link
  → webhook acquiringInternetPayment
  → credit++ или subscription_until = now+30d
  → пользователь повторяет «Создать»
```

## Поведение продукта

### Квоты

- Счётчик **на пользователя** (`user_id`), не на IP.
- Free: ровно одна колода со статусом `ready` (failed/cancel не тратит free).
- Разовый платёж: +1 кредит; кредит списывается при **старте** успешной постановки в очередь (если job падает до ready — кредит **возвращаем**).
- Месяц: флаг `plan=month` + `plan_until`; пока `now < plan_until` — генерации без списания кредитов.
- Rewrite одного слайда / спич / экспорт уже созданной колоды — **не** тратят кредит в v1.

### UX

- В `/app`: баланс («Осталось: 1 бесплатная» / «N кредитов» / «Безлимит до ДД.ММ»).
- При нуле: модалка «Ещё одна презентация — 199 ₽» + вторичная «Безлимит на месяц — 399 ₽».
- После оплаты: return URL → `/app?paid=1` + poll статуса, как payment-status у Госфото.
- На лендинге цену не рекламируем в hero (как сейчас); страница `/pricing` опционально в v1.1.

### Юридика

- Заполнить `/legal/offer` и `/legal/privacy` до включения live-токена.
- В оферте: ИП (как в футере), цены, что услуга — генерация цифровой презентации, момент оказания = доступ к колоде/`ready`.
- Чек 54-ФЗ: через фискализацию, подключённую в Точке (как у Госфото).

## Архитектура

### Модуль `billing` в `apps/api`

| Часть | Назначение |
|-------|------------|
| `tochka.ts` | Клиент: create payment link, parse webhook JWT, stub без токена |
| `billing.ts` | Квоты, checkout, mark paid, consume/refund credit |
| HTTP | `POST /api/billing/checkout`, `GET /api/billing/me`, `POST /api/payments/tochka/webhook` |
| Gate | перед `enqueueDeck`: `assertCanGenerate(userId)` |

Референс реализации: `gosphoto-api` (`app/tochka.py`, `app/payments.py`, `docs/payments-tochka.md`). Перенос логики, не копипаст Python → TS.

### Данные (Postgres)

```ts
// users — добавить
credits: number           // default 0; free отдельным флагом
free_used: boolean        // true после первой ready-колоды
plan: "free" | "month"
plan_until: Date | null

// payments
id, user_id, product: "credit_1" | "month_30"
amount_kopecks, status: "pending" | "paid" | "failed"
tochka_operation_id, payment_url, created_at, paid_at
```

Файловый JSON как у Госфото — только fallback/dev; в проде Postgres.

### Env

| Variable | Назначение |
|----------|------------|
| `TOCHKA_ACCESS_TOKEN` | JWT эквайринга |
| `TOCHKA_CUSTOMER_CODE` | optional, иначе resolve |
| `TOCHKA_MERCHANT_ID` | optional |
| `TOCHKA_API_BASE_URL` | `https://enter.tochka.com` |
| `PUBLIC_BASE_URL` | `https://pokazo.ru` |
| `PRICE_CREDIT_KOPECKS` | `19900` |
| `PRICE_MONTH_KOPECKS` | `39900` |
| `PAYMENTS_ENABLED` | `false` → все с сессией генерируют без лимита (как сейчас) |
| `BILLING_FREE_UNLOCK` | local: checkout сразу начисляет |

Webhook: `https://api.pokazo.ru/api/payments/tochka/webhook` (или через nginx `/api/` на том же хосте, как Госфото).

### Фронт

- `GET /api/billing/me` в `/app` и перед submit формы.
- Модалка оплаты → redirect на `payment_url`.
- Не блокировать просмотр уже готовых колод при нуле кредитов.

## Тестирование

- Unit: stub Tochka (как `StubTochkaClient` у Госфото): checkout → webhook → credits/plan.
- Gate: free → 1 ready; 2-й без оплаты 402; после credit — ok; refund при fail job.
- Smoke prod: оплата 1 ₽ (тест Точки) → отмена; затем live 199 ₽.
- E2E: модалка при нуле; после stub paid — кнопка «Создать» снова активна.

## Порядок внедрения

1. Схема БД + `billing/me` + gate за `PAYMENTS_ENABLED`.
2. Tochka client + webhook + checkout products.
3. UI модалка + баланс в `/app`.
4. Оферта/ПДн тексты.
5. Live token + webhook в кабинете Точки + smoke.
6. (v2) Рекуррент Точки, `/pricing`, пакеты 3/10 колод.

## Риски

| Риск | Митигация |
|------|-----------|
| Себестоимость колоды > 199 ₽ | Лимит слайдов/картинок; мониторинг cost/deck; поднять цену env |
| Webhook не дошёл | Poll статуса операции (как `PAYMENT_SYNC` у Госфото) |
| Абуза free | Только с сессией; 1 free на user_id; antifraud позже |
| Путаница «ссылка бесплатна навсегда» | Оплачена/free колода остаётся; платим за **новые** генерации |
