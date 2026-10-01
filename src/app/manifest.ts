import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RUH Construction",
    short_name: "RUH",
    description: "Ремонт под ключ в Алматы",
    start_url: "/",
    display: "standalone",
    background_color: "#0F0F11",
    theme_color: "#0F0F11",
    lang: "ru",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
