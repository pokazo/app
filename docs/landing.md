# Лендинг pokazo.ru

> Проверено: 2026-10-04 · источники: [Presentia](https://www.presentia.ai/) (layout), [wordstat-top-queries.md](./wordstat-top-queries.md), [design-system.md](./design-system.md)

## Вердикт

Одна страница. Герой — **карточка-промпт (textarea + «Создать»)**, как у Presentia. H1 = спрос Wordstat. Вход через шапку, генерация после сессии (`?topic=`).

## Референсы: что взять / отрезать

| Сервис | Взять | Не брать |
|--------|--------|----------|
| **Presentia** | Белый фон, фиолетовый CTA, центрированный H1, textarea-карточка, 3 шага кружками, сетка превью, FAQ, нижний баннер | Имя/лого, English H1, PPTX в герое, pricing $0.99, счётчик 143k |
| **Wordstat** | H1 «нейросеть для презентаций»; CTA «Создать» / «Создать презентацию»; урок/доклад/школа/студенты/бизнес | Бренд Gamma в title |
| **SimpleSlide** | «без VPN»; аудитории | «без регистрации» как главное; PPTX в первом экране |

## IA и маршруты

`/`, `/login`, `/app`, плеер `/p/:id` на API. «Создать» без сессии → `/login?next=/app&topic=`.

SEO-посадочные (slashless canonical, prerender как legal):

| Path | H1 (не каннибалит главную) |
|------|----------------------------|
| `/urok` | Презентация к уроку |
| `/doklad` | Презентация к докладу |
| `/shkola` | Презентация для школы |
| `/studenty` | Презентация для студентов |
| `/biznes` | Презентация для бизнеса |

Чипы «Для кого» на главной ведут на эти URL.

## Копирайт (канон)

**H1:** Нейросеть для презентаций (слово «Нейросеть» акцентом)  
**Под H1:** сразу поле темы, без ценового абзаца. Текст про бесплатно, 199/399 ₽ и PDF/PPTX стоит под блоком «Вопросы». Источник правды — `apps/web/src/home-copy.json`.  
**Placeholder:** Например: «Фотосинтез, 8 слайдов, 8 класс»  
**CTA:** Создать  
**Футер:** Оферта · Персональные данные · ИП Бутов А. С. (ИНН / ОГРНИП)  
**Шапка:** Войти  
**Три шага:** 1. Тема 2. ИИ собирает слайды 3. Смотрите по ссылке  
**Для кого:** Урок · Доклад · Школа · Студенты · Бизнес  

**FAQ:** Нужен ли VPN? Нет. Можно без PowerPoint? Да, показ по ссылке. Можно скачать PDF или PPTX? Да, PPTX — картинки слайдов. На каком языке? На русском. Можно по готовому тексту? План или конспект до 500 символов; Word/PDF как источник не загружается; картинки JPEG/PNG/WebP можно.

Не писать: «лучше Gamma», «Export to PowerPoint», «бесплатно навсегда».

## SEO

Title: `Нейросеть для презентаций — Показо`  
Description: `Нейросеть для презентаций на русском. Первая бесплатно, затем 199 ₽ или 399 ₽ за 30 дней. Показ по ссылке, скачать PDF и PPTX.`  
H1 один. Не пихать «гамма» в title.

После `vite build` запускается `scripts/seo-build.mjs`: в `index.html` кладётся crawler-visible HTML из `src/home-copy.json` (H1/FAQ/JSON-LD), `shell.html` — пустой `#root` для `/app|/login|…`, legal и contact/pricing — отдельные `<path>/index.html`. Аудитории собираются из `src/audience.json`, без ручных `*-body.html`. Nginx: `deploy/landing/spa.conf` (слэш → 301 на canonical без слэша, нет soft-404, есть robots/sitemap/IndexNow). Главная H1 остаётся «Нейросеть для презентаций»; audience H1 — кластерные, без Gamma в title.

## Метрика

`data-pk="cta-create"`, `data-pk="cta-login"`, `data-pk="auth-yandex"`, `data-pk="cta-pricing-nav"`, `data-pk="pricing-view"`, `data-pk="cta-pricing-free"`, `data-pk="cta-pricing-credit"`, `data-pk="cta-pricing-month"`. Оплата (JS): `payment_checkout_credit`, `payment_checkout_month`, `payment_paid_credit`, `payment_paid_month`. Первая бесплатная колода в статусе `ready`: `deck_free_ready`.

## Не брать / оговорки

Превью — статичные карточки, не живой Slidev.

## История правок

| Дата | Что изменили |
|------|----------------|
| 2026-10-23 | Главная и аудитории из JSON: цена, PDF/PPTX, «по тексту» до 500 символов; 301 без слэша |
| 2026-10-12 | SEO-посадочные `/urok` `/doklad` `/shkola` `/studenty` `/biznes` |
| 2026-10-12 | «Для кого»: Урок · Доклад · Школа · Студенты · Бизнес (Wordstat) |
| 2026-10-06 | Спринт 1 Яндекс: prerender HTML, robots/sitemap/IndexNow, nginx 404 |
| 2026-10-04 | Каркас под Presentia, копирайт Wordstat |
| 2026-10-04 | IA, копирайт, таблица референсов |
