// Проверка текстов сайта (ТЗ разделы 3, 6.13, 9, 12): запуск npm run lint:content
//  - у ru и kk одинаковый набор ключей (ничего не потеряно при переводе)
//  - одинаковые ICU-переменные {name} в обеих версиях
//  - нет длинных тире и эмодзи; в русском нет буквы «ё»; в казахском нет длинных тире
//  - в казахских строках есть кириллица (строка не осталась на русском/английском по ошибке)
//  - перечисляет места TODO_CLIENT
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (l) => JSON.parse(fs.readFileSync(path.join(root, "content", `${l}.json`), "utf8"));
const ru = load("ru");
const kk = load("kk");

const errors = [];
const warns = [];

function flat(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, flat(v, key));
    else out[key] = v;
  }
  return out;
}
const fr = flat(ru);
const fk = flat(kk);

for (const k of Object.keys(fr)) if (!(k in fk)) errors.push(`kk: нет ключа ${k}`);
for (const k of Object.keys(fk)) if (!(k in fr)) errors.push(`ru: нет ключа ${k}`);

const vars = (s) =>
  [...String(s).matchAll(/\{(\w+)(?:,[^}]*)?\}/g)]
    .map((m) => m[1])
    .sort()
    .join(",");
const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
const cyr = /[Ѐ-ӿ]/;

for (const [k, v] of Object.entries(fr)) {
  if (typeof v !== "string") continue;
  if (/[–—]/.test(v)) errors.push(`ru ${k}: длинное тире`);
  if (emoji.test(v)) errors.push(`ru ${k}: эмодзи`);
  if (/[ёЁ]/.test(v)) errors.push(`ru ${k}: буква ё (по ТЗ заменяем на е)`);
  if (v.includes("TODO_CLIENT")) warns.push(`ru ${k}: TODO_CLIENT`);
  if (k in fk && typeof fk[k] === "string" && vars(v) !== vars(fk[k]) && !k.endsWith(".ratingLine")) {
    errors.push(`${k}: разные переменные ICU: ru{${vars(v)}} kk{${vars(fk[k])}}`);
  }
}
for (const [k, v] of Object.entries(fk)) {
  if (typeof v !== "string") continue;
  if (/[–—]/.test(v)) errors.push(`kk ${k}: длинное тире`);
  if (emoji.test(v)) errors.push(`kk ${k}: эмодзи`);
  if (!cyr.test(v) && !/^[\d\s.,:;/%₸©{}()a-zA-Z+@·-]+$/.test(v)) warns.push(`kk ${k}: нет кириллицы: "${v}"`);
  if (v.includes("TODO_CLIENT")) warns.push(`kk ${k}: TODO_CLIENT`);
}
// строка в kk не должна совпадать с ru дословно (кроме брендов и коротких технических)
for (const [k, v] of Object.entries(fk)) {
  if (typeof v === "string" && v === fr[k] && cyr.test(v) && v.length > 14) warns.push(`kk ${k}: совпадает с ru (не переведено?): "${v}"`);
}

// фото: у каждого id в gallery.json есть alt на обоих языках
const galleryPath = path.join(root, "content", "gallery.json");
if (fs.existsSync(galleryPath)) {
  const gallery = JSON.parse(fs.readFileSync(galleryPath, "utf8"));
  for (const p of gallery.items ?? gallery) {
    if (!ru.photos?.[p.id]) errors.push(`photos.${p.id}: нет alt в ru`);
    if (!kk.photos?.[p.id]) errors.push(`photos.${p.id}: нет alt в kk`);
  }
}

for (const w of warns) console.warn("WARN ", w);
for (const e of errors) console.error("ERROR", e);
console.log(`\nКлючей: ru ${Object.keys(fr).length}, kk ${Object.keys(fk).length}. Ошибок: ${errors.length}, предупреждений: ${warns.length}`);
process.exit(errors.length ? 1 : 0);
