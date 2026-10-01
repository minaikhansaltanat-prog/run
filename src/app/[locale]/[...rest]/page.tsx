import { notFound } from "next/navigation";

// Любой неизвестный адрес внутри языка показывает локализованную страницу 404 ([locale]/not-found.tsx)
export default function CatchAll() {
  notFound();
}
