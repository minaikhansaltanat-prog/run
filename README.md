# RUH Construction: сайт

Сайт ремонтной компании RUH Construction (Алматы): лендинг из 10 блоков, галерея, страницы объектов, подарок (прайс-лист).
Языки: русский (основной, без префикса) и казахский (`/kk`).

Стек: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 + собственные CSS, next-intl, zod, sharp.

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # заполнить при необходимости (см. ниже)
npm run dev                  # http://localhost:3000
```

Продакшен-сборка локально: `npm run build && npm start`.
Для скриншотов и проверок в рабочей папке есть `node serve.mjs` (localhost:3000) и `node screenshot.mjs http://localhost:3000`.
Проверка версии для GitHub Pages: `npm run build:static && npm run serve:static` -> http://localhost:3000/run/ru/ (локальная проверка всегда с подпапкой `/run`, в проде ее уже нет — см. ниже).

## Команды

| Команда | Что делает |
|---------|-----------|
| `npm run dev` / `build` / `start` | разработка, сборка, запуск (полная версия с сервером) |
| `npm run build:static` | статическая версия для GitHub Pages в папку `out/` (без сервера) |
| `npm run serve:static` | локально отдает `out/` так же, как GitHub Pages (подпапка `/run`, 404.html) |
| `npm run typecheck` | проверка типов |
| `npm test` | unit-тесты (маска и проверка телефона) |
| `npm run lint:content` | сверка ключей ru/kk, пустые и непереведенные строки |
| `npm run check:overflow` | нет горизонтального переполнения на 360-1920 px (нужен запущенный сайт) |
| `npm run check:pricelist` | прайс-лист открывается, рисуется, не скачивается и не копируется (защита работает) |
| `npm run check:taps` | ничто не перекрывает кнопки и ссылки (плавающая кнопка, шапка, панель) на телефоне и компьютере |
| `npm run check:contrast` | контраст текста по токенам палитры |
| `npm run photos` | конвейер фото: апскейл, цветокоррекция, AVIF/WebP/JPEG в `public/img` |
| `npm run pricelist` | собрать страницы прайс-листа (`python scripts/build-pricelist.py`) |

## Переменные окружения

См. `.env.example`. Секреты только в окружении, не в репозитории.

| Переменная | Назначение |
|------------|-----------|
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | куда приходят заявки; без них форма предлагает WhatsApp |
| `NEXT_PUBLIC_SITE_URL` | адрес сайта (canonical, sitemap, Open Graph) |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | аналитика, грузится только после согласия на cookies |

## Выкладка на GitHub Pages (основной способ, бесплатно)

Сайт собирается как набор статических файлов и публикуется автоматически при каждом `git push` в `main`
(workflow `.github/workflows/pages.yml`). Живет на собственном домене **https://ruxa.kz** (без подпапки); адрес задан прямо в workflow (`BASE_PATH=""`, `NEXT_PUBLIC_SITE_URL=https://ruxa.kz`).

Включить один раз:
1. GitHub -> **Settings -> Pages -> Build and deployment -> Source: GitHub Actions** (не "Deploy from a branch").
2. Там же **Custom domain**: вписать `ruxa.kz`, сохранить. Галочку **Enforce HTTPS** поставить, когда GitHub выдаст сертификат (после того как DNS прописан и виден снаружи — обычно до суток, иногда дольше).
3. У регистратора домена (ps.kz -> личный кабинет -> DNS-записи для ruxa.kz) добавить:

   | Тип | Имя/хост | Значение | Примечание |
   |---|---|---|---|
   | A | `@` (или пусто, apex-домен) | `185.199.108.153` | все четыре A-записи на apex |
   | A | `@` | `185.199.109.153` | |
   | A | `@` | `185.199.110.153` | |
   | A | `@` | `185.199.111.153` | |
   | CNAME | `www` | `minaikhansaltanat-prog.github.io` | чтобы `www.ruxa.kz` тоже открывал сайт |

   Если у ps.kz уже стоит своя запись A/CNAME на `@` (например, парковочная страница) — ее нужно удалить, иначе будет конфликт.
4. Проверить распространение DNS: `nslookup ruxa.kz` должен показывать IP из списка выше (может занять от нескольких минут до нескольких часов).

Дальше каждый push собирает и выкладывает сайт за 3-5 минут; ход сборки виден во вкладке **Actions**.
Файл `CNAME` в сборке (`out/CNAME`) кладется на случай ручного переключения источника Pages на "Deploy from a branch"; при источнике "GitHub Actions" домен хранится в настройках репозитория, этот файл не обязателен.

Что отличается от полной (серверной) версии, потому что у GitHub Pages нет сервера:

| | GitHub Pages | Сервер (Vercel, свой Node) |
|---|---|---|
| Заявки из форм | открывается WhatsApp с готовым сообщением, клиент нажимает "отправить" | сразу в Telegram через бота, без действий клиента |
| Адреса | `/ru/`, `/kk/` (оба языка с префиксом), корень `/` выбирает язык по браузеру | русский без префикса, казахский `/kk` |
| Заголовки безопасности (HSTS и др.) | задает GitHub | задает `next.config.ts` |

Переменные для аналитики в Pages задаются как Variables: Settings -> Secrets and variables -> Actions -> Variables (`NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`).
Токен Telegram-бота в статический сайт класть нельзя: он стал бы виден всем.

Для локальной проверки сборки в подпапке (как было раньше на `github.io/run`) используйте `npm run build:static` без переменных — по умолчанию подставится `/run`.

## Выкладка с сервером (Vercel или свой Node), если понадобится прямая отправка заявок в Telegram

1. Импортировать репозиторий в Vercel (Framework: Next.js, команды по умолчанию).
2. Добавить переменные окружения из таблицы выше (Production).
3. Подключить домен, поставить `NEXT_PUBLIC_SITE_URL`.
4. После выкладки замерить PageSpeed Insights и проверить форму: тестовая заявка должна прийти в Telegram.

## Как обновлять контент

- **Тексты ru/kk**: `content/ru.json`, `content/kk.json` (одинаковые ключи; `npm run lint:content` ловит расхождения).
- **Контакты, ссылки, подарок**: `config/site.ts`.
- **Прайс-лист (подарок)**: показывается на экране кнопкой «Смотреть прайс-лист», скачать его нельзя. Новый PDF положить в `assets/pricelist/source.pdf` и выполнить `npm run pricelist` (нужны `pip install pymupdf pillow`): скрипт делает страницы-картинки с водяным знаком в `public/pricelist` и список `content/pricelist.json`; их коммитят, **сам PDF не коммитится** (он в `.gitignore`).
- **Смета-калькулятор** убран по решению клиента. Последняя версия с ним сохранена в git-теге `calculator-v1` (`git checkout calculator-v1`).
- **Объекты**: `content/objects.json` (+ тексты в `content/*.json`, раздел `objects`). Площадь/срок/год заполнять только по подтвержденным данным.
- **Отзывы**: `content/reviews.json` (только с разрешения авторов).
- **Фото**: исходники в `assets/raw` (имена p01, p02, ...), список, комната и порядок в `config/photos.json`, затем `npm run photos`. Результат попадает в `public/img` и `content/gallery.json`.
- **Новые фото в галерею**: 1) положить файл в `assets/raw/pNN.jpg`; 2) добавить запись в `config/photos.json` (`id` ph-00NN, `room`: living, kitchen, bedroom, bathroom, hall, balcony или detail, `order`, `featured`); 3) дописать описание фото (alt) в `content/ru.json` и `content/kk.json`, раздел `photos`; 4) `python scripts/grade_photos.py pNN`, затем `node scripts/enhance-photos.mjs --skip-grade pNN`. Фильтры галереи строятся сами по комнатам, в которых есть фото. Апскейл Real-ESRGAN (`node scripts/upscale-photos.mjs`, около 3 минут на фото) запускается до цветокоррекции и необязателен.
- **Логотип и шрифты**: `scripts/build-logo.py`, `scripts/build-fonts.py` (нужны Python и fontTools; готовые файлы уже лежат в `public/brand` и `src/fonts`).

## Структура

```
config/      сайт, пресет цветокоррекции, список фото
content/     тексты ru/kk, объекты, отзывы, данные галереи
docs/        открытые вопросы, дизайн-решения, отчет по фото, проверка шрифтов
public/      img (оптимизированные фото), brand (логотипы), downloads
scripts/     фото-конвейер, проверки, build-static и serve-static (GitHub Pages)
.github/     workflow выкладки на GitHub Pages
src/app/     страницы ([locale]), API заявок (серверная версия), стили
src/components/  секции, шапка, подвал, форма заявки, подарок, галерея
src/lib/     аналитика, телефон, SEO, сервер (rate limit, Telegram)
```

## Документы

- [docs/open-questions.md](docs/open-questions.md): что ждем от клиента (все `TODO_CLIENT`).
- [docs/design-decisions.md](docs/design-decisions.md): палитра, шрифты, принципы, отступления от ТЗ.
- [docs/photo-qa/report.md](docs/photo-qa/report.md): отчет по обработке фото.
- [docs/font-glyph-check.md](docs/font-glyph-check.md): проверка глифов казахского алфавита.

## Безопасность и приватность

В серверной версии форма защищена honeypot-полем, проверкой времени заполнения и ограничением частоты; данные валидируются zod на сервере. Токены только в окружении.
В версии для GitHub Pages сервера нет: заявка собирается в браузере и уходит в WhatsApp, секретов на сайте нет.
Аналитика и пиксель не грузятся до согласия на cookies. Текст страницы конфиденциальности шаблонный: перед запуском нужна проверка юриста.
