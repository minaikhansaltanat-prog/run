import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { pick } from "@/lib/pick";

/**
 * Передает в браузер только те разделы текстов, которые нужны вложенным клиентским компонентам.
 * Так страница не тащит весь словарь (калькулятор, галерея, подарок) в первый HTML и первый JS.
 */
export async function ClientMessages({ namespaces, children }: { namespaces: readonly string[]; children: ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <NextIntlClientProvider locale={locale} messages={pick(messages as Record<string, unknown>, namespaces)}>
      {children}
    </NextIntlClientProvider>
  );
}
