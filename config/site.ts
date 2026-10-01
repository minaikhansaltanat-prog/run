// Контакты и ссылки компании. Источник: ТЗ раздел 1 (подтверждено публичными источниками, 2ГИС).
// Все места, помеченные TODO_CLIENT, клиент еще не подтвердил: см. docs/open-questions.md

const PHONE_E164 = "+77779233331";

export const site = {
  name: "RUH Construction",
  legalName: "RUH Construction",
  phone: { display: "+7 777 923 33 31", tel: `tel:${PHONE_E164}`, e164: PHONE_E164, digits: "77779233331" },
  whatsapp: "https://wa.me/77779233331",
  telegram: "https://t.me/RUHCONSTRUCTION",
  telegramHandle: "@RUHCONSTRUCTION",
  instagram: "https://www.instagram.com/ruh.construction",
  instagramHandle: "@ruh.construction",
  tiktok: "https://www.tiktok.com/@ruh.construction",
  facebook: "https://www.facebook.com/RUH-Construction",
  // TODO_CLIENT: точная ссылка на карточку компании в 2ГИС (пока поиск по названию)
  twoGis: "https://2gis.kz/almaty/search/RUH%20Construction",
  // карта по адресу (открывается в новой вкладке; без API-ключей и без сторонних cookie на загрузке страницы)
  googleMaps:
    "https://www.google.com/maps/search/?api=1&query=%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B%2C+%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82+%D0%94%D0%BE%D1%81%D1%82%D1%8B%D0%BA+40",
  mapEmbed:
    "https://www.google.com/maps?q=%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B%2C+%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82+%D0%94%D0%BE%D1%81%D1%82%D1%8B%D0%BA+40&output=embed",
  address: {
    street: "пр. Достык, 40, 1 этаж",
    district: "Медеуский район",
    city: "Алматы",
    postalCode: "050010",
    country: "KZ",
  },
  // рейтинг 2ГИС на 01.10.2026: 5.0, 23 оценки, 20 отзывов (ТЗ раздел 1)
  rating: { value: 5.0, count: 23, reviews: 20 },
  // TODO_CLIENT: часы работы (в карточке 2ГИС противоречивые данные), на сайт не выводятся
  hours: null as null | string,
  // TODO_CLIENT: реквизиты (ТОО/ИП, БИН), на сайт не выводятся
  requisites: null as null | string,
} as const;

/** Предзаполненное сообщение в WhatsApp */
export function whatsappLink(text: string): string {
  return `${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

/**
 * Файл подарка (прайс-лист). Клиент кладет PDF в public/downloads/ruh-price-list.pdf,
 * затем ставит available: true. Пока файла нет, форма принимает заявку и менеджер присылает прайс сам.
 * TODO_CLIENT: прайс-лист от клиента (см. docs/open-questions.md, пункт про прайс).
 */
export const gift = {
  file: "/downloads/ruh-price-list.pdf",
  available: false,
} as const;
