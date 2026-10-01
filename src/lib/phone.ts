// Телефон Казахстана: маска +7 777 123 45 67 и нормализация к E.164 (+77771234567)

/**
 * Цифры национальной части (10 цифр после +7).
 * Если строка начинается с "+7", первая цифра это код страны; иначе 7/8 в начале срезаем только у 11-значного ввода.
 */
export function nationalDigits(input: string): string {
  const trimmed = input.trim();
  let d = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+7")) d = d.slice(1);
  else if (d.length >= 11 && (d[0] === "7" || d[0] === "8")) d = d.slice(1);
  return d.slice(0, 10);
}

/** Форматирует ввод на лету: +7 777 123 45 67 */
export function maskPhone(input: string): string {
  const d = nationalDigits(input);
  if (!d && !input.trim()) return "";
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean);
  return `+7 ${p.join(" ")}`.trimEnd();
}

/** Учитывает удаление: если пользователь стер только разделитель, убираем последнюю цифру */
export function maskPhoneOnChange(next: string, prev: string): string {
  if (next.length < prev.length && nationalDigits(next) === nationalDigits(prev)) {
    const d = nationalDigits(prev).slice(0, -1);
    return d ? maskPhone(`+7 ${d}`) : "";
  }
  return maskPhone(next);
}

export function toE164(input: string): string | null {
  const d = nationalDigits(input);
  return d.length === 10 ? `+7${d}` : null;
}

export function isValidPhone(input: string): boolean {
  return nationalDigits(input).length === 10;
}
