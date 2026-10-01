# RUH Construction: сайт

Сайт ремонтной компании RUH Construction (Алматы): лендинг из 10 блоков, смета-калькулятор, галерея, страницы объектов.
Языки: русский (основной, без префикса) и казахский (`/kk`).

Стек: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 + собственные CSS, next-intl, zod, @react-pdf/renderer, sharp.

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # заполнить при необходимости (см. ниже)
npm run dev                  # http://localhost:3000
```

Продакшен-сборка локально: `npm run build && npm start`.
Для скриншотов и проверок в рабочей папке есть `node serve.mjs` (localhost:3000) и `node screenshot.mjs http://localhost:3000`.

## Команды

| Команда | Что делает |
|---------|-----------|
| `npm run dev` / `build` / `start` | разработка, сборка, запуск |
| `npm run typecheck` | проверка типов |
| `npm test` | 39 unit-тестов (движок калькулятора, состояние, телефон) |
| `npm run lint:content` | сверка ключей ru/kk, пустые и непереведенные строки |
| `npm run check:overflow` | нет горизонтального переполнения на 360-1920 px (нужен запущенный сайт) |
| `npm run check:contrast` | контраст текста по токенам палитры |
| `npm run photos` | конвейер фото: апскейл, цветокоррекция, AVIF/WebP/JPEG в `public/img` |
| `npm run pricing:template` | создать `pricing-template.xlsx` для клиента |
| `npm run pricing:import -- файл.xlsx` | проверить прайс и показать различия (`--write` применить, `--allow-approved` разрешить публикацию цен) |

## Переменные окружения

См. `.env.example`. Секреты только в окружении, не в репозитории.

| Переменная | Назначение |
|------------|-----------|
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | куда приходят заявки; без них форма предлагает WhatsApp |
| `NEXT_PUBLIC_SITE_URL` | адрес сайта (canonical, sitemap, Open Graph) |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | аналитика, грузится только после согласия на cookies |
| `ALLOW_PRICING_PREVIEW` | показывать калькулятор с тестовыми ценами на preview (`?pricing=preview`); в production пусто |

## Выкладка на Vercel

1. Импортировать репозиторий в Vercel (Framework: Next.js, команды по умолчанию).
2. Добавить переменные окружения из таблицы выше (Production).
3. Подключить домен, поставить `NEXT_PUBLIC_SITE_URL`.
4. После выкладки замерить PageSpeed Insights и проверить форму: тестовая заявка должна прийти в Telegram.

## Как обновлять контент

- **Тексты ru/kk**: `content/ru.json`, `content/kk.json` (одинаковые ключи; `npm run lint:content` ловит расхождения).
- **Контакты, ссылки, подарок**: `config/site.ts`.
- **Прайс-лист (подарок)**: положить PDF в `public/downloads/ruh-price-list.pdf` и поставить `gift.available: true` в `config/site.ts`.
- **Цены калькулятора**: клиент заполняет `pricing-template.xlsx` -> `npm run pricing:import -- файл.xlsx --write --allow-approved`. Пока `pricingApproved: false`, цифры на сайте не показываются; пересчет цены всегда делается на сервере.
- **Объекты**: `content/objects.json` (+ тексты в `content/*.json`, раздел `objects`). Площадь/срок/год заполнять только по подтвержденным данным.
- **Отзывы**: `content/reviews.json` (только с разрешения авторов).
- **Фото**: исходники в `assets/raw`, список и порядок в `config/photos.json`, затем `npm run photos`. Результат попадает в `public/img` и `content/gallery.json`.
- **Логотип и шрифты**: `scripts/build-logo.py`, `scripts/build-fonts.py` (нужны Python и fontTools; готовые файлы уже лежат в `public/brand` и `src/fonts`).

## Структура

```
config/      сайт, прайс (тестовый), пресет цветокоррекции, список фото
content/     тексты ru/kk, объекты, отзывы, данные галереи
docs/        открытые вопросы, дизайн-решения, отчет по фото, проверка шрифтов
public/      img (оптимизированные фото), brand (логотипы), downloads
scripts/     фото-конвейер, проверки, шаблон и импорт прайса
src/app/     страницы ([locale]), API (заявки, PDF сметы), стили
src/components/  секции, шапка, подвал, форма, калькулятор, галерея
src/lib/     движок сметы, аналитика, сервер (rate limit, Telegram, PDF)
```

## Документы

- [docs/open-questions.md](docs/open-questions.md): что ждем от клиента (все `TODO_CLIENT`).
- [docs/design-decisions.md](docs/design-decisions.md): палитра, шрифты, принципы, отступления от ТЗ.
- [docs/photo-qa/report.md](docs/photo-qa/report.md): отчет по обработке фото.
- [docs/font-glyph-check.md](docs/font-glyph-check.md): проверка глифов казахского алфавита.

## Безопасность и приватность

Форма защищена honeypot-полем, проверкой времени заполнения и ограничением частоты; данные валидируются zod на сервере. Токены только в окружении.
Аналитика и пиксель не грузятся до согласия на cookies. Текст страницы конфиденциальности шаблонный: перед запуском нужна проверка юриста.
