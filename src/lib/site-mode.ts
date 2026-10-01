// Режимы сборки. Обычная сборка (Vercel, свой Node-сервер) использует API-маршруты и proxy.
// Статическая (GitHub Pages): npm run build:static. Там нет сервера, поэтому заявки уходят через WhatsApp,
// у всех языков есть префикс (/ru, /kk), а сайт может жить в подпапке репозитория (BASE_PATH=/run).
// Значения подставляются при сборке через next.config.ts (env).

/** true, если сайт собран как набор статических файлов без сервера */
export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

/** Подпапка, в которой лежит сайт (например /run для minaikhansaltanat-prog.github.io/run). Пусто на своем домене. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Путь к файлу из public с учетом подпапки. Нужен для <img>, CSS и ссылок, которые Next сам не переписывает. */
export const asset = (path: string): string => `${BASE_PATH}${path}`;
