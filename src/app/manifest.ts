import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { asset, STATIC_SITE } from "@/lib/site-mode";

// статический файл: нужен для сборки output: export (GitHub Pages)
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RUH Construction",
    short_name: "RUH",
    description: "Ремонт под ключ в Алматы",
    start_url: STATIC_SITE ? `${asset("/")}${routing.defaultLocale}/` : "/",
    display: "standalone",
    background_color: "#0F0F11",
    theme_color: "#0F0F11",
    lang: "ru",
    icons: [
      { src: asset("/icon.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: asset("/apple-icon.png"), sizes: "180x180", type: "image/png" },
    ],
  };
}
