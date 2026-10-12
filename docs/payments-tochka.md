# Tochka payments — deploy checklist

Биллинг Pokazo: **1 бесплатная** колода (`ready`), далее **199 ₽/кредит** или **399 ₽/30 суток** безлимита. Rewrite / speech / экспорт уже созданной колоды — без списания (v1).

| Product | Price | Unlock |
|---------|-------|--------|
| `credit_1` | 199 ₽ (`PRICE_CREDIT_KOPECKS=19900`) | +1 генерация колоды |
| `month_30` | 399 ₽ (`PRICE_MONTH_KOPECKS=39900`) | безлимит до `plan_until` (+30 суток) |

## Env (API VPS `/etc/pokazo/api.env`)

| Variable | Prod |
|----------|------|
| `TOCHKA_ACCESS_TOKEN` | JWT эквайринга Точки |
| `TOCHKA_CUSTOMER_CODE` | customerCode (или авто-resolve) |
| `TOCHKA_MERCHANT_ID` | optional |
| `TOCHKA_API_BASE_URL` | `https://enter.tochka.com` |
| `PUBLIC_BASE_URL` | `https://pokazo.ru` |
| `PRICE_CREDIT_KOPECKS` | `19900` |
| `PRICE_MONTH_KOPECKS` | `39900` |
| `PAYMENTS_ENABLED` | **`false` до live** — при `true` gate на `POST /api/decks` |
| `BILLING_FREE_UNLOCK` | `false` (local: `true` → checkout сразу начисляет без Точки) |

**Токен:** если Pokazo и Госфото на одном ИП/мерчанте — можно **тот же JWT**, что на gosphoto; сверить merchant/customer в кабинете Точки перед prod.

**Включать `PAYMENTS_ENABLED=true` только когда:**

1. Живые `/legal/offer` и `/legal/privacy` (не заглушки).
2. `TOCHKA_ACCESS_TOKEN` выставлен (не stub).
3. Webhook зарегистрирован в Точке (см. ниже).

## Webhook

- URL: **`https://api.pokazo.ru/api/payments/tochka/webhook`**
- Nginx API: маршрут `/api/payments/tochka/webhook` → контейнер Hono
- В кабинете Точки: acquiring webhook → этот URL
- Подпись: JWT RS256 (`acquiringInternetPayment`), публичный ключ Точки в `apps/api/src/tochka.ts`

## Smoke (перед prod)

1. **Local stub** — без `TOCHKA_ACCESS_TOKEN`: `POST /api/billing/checkout` → fake `payment_url`; опционально `BILLING_FREE_UNLOCK=true` для мгновенного начисления.
2. **Tochka test 1 ₽** — временно занизить `PRICE_CREDIT_KOPECKS=100`, live token, оплатить, дождаться webhook → `GET /api/billing/me` (кредит/+month).
3. **Refund** — вернуть тестовый платёж в банке / support Точки; убедиться, что повторная оплата проходит.
4. **Live 199 ₽** — вернуть `PRICE_CREDIT_KOPECKS=19900`, `PAYMENTS_ENABLED=true`, полный цикл: free исчерпан → paywall → оплата → `POST /api/decks` → колода `ready`.

## Prod sanity

- `GET /api/billing/me` — баланс в `/app`
- После оплаты return URL: `/app?paid=1` + poll статуса (как payment-status у Госфото)
- Очередь: failed job → кредит возвращается; free тратится только на первую `ready`
