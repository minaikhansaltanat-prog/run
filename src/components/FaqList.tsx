"use client";
import { useId, useState } from "react";
import { Plus } from "@phosphor-icons/react";

export function FaqList({ items }: { items: { id: string; q: string; a: string }[] }) {
  const uid = useId();
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return (
    <ul className="faq__list" role="list">
      {items.map((it) => {
        const isOpen = open === it.id;
        const bid = `${uid}-b-${it.id}`;
        const pid = `${uid}-p-${it.id}`;
        return (
          <li key={it.id} className="faq__item" data-open={isOpen ? "true" : "false"}>
            <h3>
              <button
                id={bid}
                type="button"
                className="faq__q"
                aria-expanded={isOpen}
                aria-controls={pid}
                onClick={() => setOpen(isOpen ? null : it.id)}
              >
                <span>{it.q}</span>
                <span className="faq__plus" aria-hidden="true">
                  <Plus size={20} weight="bold" />
                </span>
              </button>
            </h3>
            <div id={pid} role="region" aria-labelledby={bid} hidden={!isOpen} className="faq__a">
              <p>{it.a}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
