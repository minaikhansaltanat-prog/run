import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Статическая выгрузка для GitHub Pages: STATIC_EXPORT=1 npm run build (см. scripts/build-static.mjs)
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = isStatic ? (process.env.BASE_PATH ?? "").replace(/\/$/, "") : "";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const staticAssetCache = [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // не дописывать служебный блок в CLAUDE.md (файл правил проекта ведет заказчик)
  agentRules: false,
  reactStrictMode: true,
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "motion"],
  },
  env: {
    NEXT_PUBLIC_STATIC_EXPORT: isStatic ? "1" : "",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(isStatic
    ? {
        // GitHub Pages: набор файлов в папке out, каждая страница как каталог с index.html
        output: "export" as const,
        trailingSlash: true,
        basePath: basePath || undefined,
        images: { unoptimized: true },
      }
    : {
        // файл подарка (прайс-лист) должен попасть в serverless-функцию на Vercel
        outputFileTracingIncludes: {
          "/api/lead": ["./public/downloads/**"],
        },
        async headers() {
          return [
            { source: "/:path*", headers: securityHeaders },
            { source: "/img/:path*", headers: staticAssetCache },
            { source: "/brand/:path*", headers: staticAssetCache },
            { source: "/downloads/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
          ];
        },
      }),
};

export default withNextIntl(nextConfig);
