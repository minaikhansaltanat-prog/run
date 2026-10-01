// Отправка заявки менеджеру через Telegram Bot API. Токен и chat id только из переменных окружения.

export interface TelegramResult {
  ok: boolean;
  /** true, если переменные не заданы: в development заявка пишется в консоль */
  skipped?: boolean;
  error?: string;
}

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(text: string): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[lead:dev] TELEGRAM_* не заданы, заявка не отправлена, вот текст:\n" + text);
      return { ok: true, skipped: true };
    }
    return { ok: false, error: "not_configured" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3900), disable_web_page_preview: true }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, error: `telegram_${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.name : "network" };
  } finally {
    clearTimeout(timer);
  }
}
