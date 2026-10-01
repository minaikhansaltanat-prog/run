// Форматирование сумм без Intl: одинаковый результат на сервере и в браузере (нет ошибок гидратации)

/** 2430000 -> "2 430 000" (неразрывные пробелы) */
export function formatNumber(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  return (
    sign +
    Math.abs(rounded)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")
  );
}

export function formatRange(low: number, high: number): string {
  return `${formatNumber(low)} - ${formatNumber(high)}`;
}

/** для Telegram и PDF: обычные пробелы */
export function plain(s: string): string {
  return s.replace(/\u00A0/g, " ");
}
