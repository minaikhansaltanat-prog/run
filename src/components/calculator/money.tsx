import { Fragment, type ReactNode } from "react";

/** Знак тенге набираем шрифтом интерфейса (Onest): в заголовочном Playfair его нет, браузер подставлял чужой начерк */
export function withCurrency(text: string): ReactNode {
  const parts = text.split("₸");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && <span className="cur">{"₸"}</span>}
    </Fragment>
  ));
}
