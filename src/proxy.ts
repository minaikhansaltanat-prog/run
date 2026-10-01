import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Определение языка по Accept-Language и cookie, префикс /kk для казахского
export default createMiddleware(routing);

export const config = {
  // всё, кроме api, служебных путей Next и файлов со статикой
  matcher: ["/((?!api|_next|_vercel|img|brand|fonts|downloads|.*\\..*).*)"],
};
