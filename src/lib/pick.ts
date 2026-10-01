/** Выбирает из объекта сообщений только нужные разделы (в браузер уходит минимум текста) */
export function pick<T extends Record<string, unknown>>(obj: T, keys: readonly string[]): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as Partial<T>;
}
