// Статическая сборка для GitHub Pages: npm run build:static  ->  папка out/
//
// Что делает:
//   1. Временно убирает серверные части, которых нет на статическом хостинге (api, proxy, catch-all 404).
//   2. Запускает next build с STATIC_EXPORT=1 (output: export, префиксы /ru и /kk, подпапка BASE_PATH).
//   3. Дописывает то, что Next сам не умеет: корневую страницу выбора языка, русско-казахскую 404, .nojekyll.
//   4. Возвращает убранные файлы на место (даже если сборка упала).
//
// Переменные: BASE_PATH (по умолчанию /run; на своем домене задать пустым), NEXT_PUBLIC_SITE_URL
// (адрес сайта вместе с подпапкой; по умолчанию http://localhost:3000 + BASE_PATH для локальной проверки).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stash = path.join(root, ".cache", "static-stash");
const basePath = (process.env.BASE_PATH ?? "/run").replace(/\/$/, "");
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:3000${basePath}`).replace(/\/$/, "");
const out = path.join(root, "out");

// что убрать на время сборки: [путь в проекте, имя в тайнике]
const SERVER_ONLY = [
  ["src/app/api", "api"],
  ["src/proxy.ts", "proxy.ts"],
  ["src/app/[locale]/[...rest]", "rest"],
];

const moved = [];
function restore() {
  while (moved.length) {
    const [from, to] = moved.pop();
    if (fs.existsSync(to)) fs.renameSync(to, from);
  }
}
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    restore();
    process.exit(130);
  });
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

let status = 1;
try {
  rmrf(stash);
  fs.mkdirSync(stash, { recursive: true });
  for (const [rel, name] of SERVER_ONLY) {
    const from = path.join(root, rel);
    if (!fs.existsSync(from)) continue;
    const to = path.join(stash, name);
    fs.renameSync(from, to);
    moved.push([from, to]);
  }
  // кэш обычной сборки не должен попасть в статическую
  rmrf(path.join(root, ".next"));
  rmrf(out);

  const env = {
    ...process.env,
    STATIC_EXPORT: "1",
    BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const res = spawnSync(process.execPath, [nextBin, "build"], { cwd: root, env, stdio: "inherit" });
  status = res.status ?? 1;
  if (status === 0) {
    for (const lang of ["ru", "kk"]) {
      if (!fs.existsSync(path.join(out, lang, "index.html"))) throw new Error(`В out нет ${lang}/index.html: сборка неполная`);
    }
    writeExtras();
    console.log(`\nГотово: ${out}\nАдрес сайта: ${siteUrl}/  (подпапка: "${basePath || "/"}")`);
  }
} finally {
  restore();
  rmrf(path.join(root, ".next")); // чтобы следующий npm run dev/build не взял статические артефакты
}
process.exit(status);

// ---------------------------------------------------------------------------

/**
 * Клиентский роутер Next 16 просит данные страницы одним плоским файлом: kk/__next.$d$locale.gallery.__PAGE__.txt,
 * а при выгрузке они могут лечь во вложенные папки: kk/__next.$d$locale/gallery/__PAGE__.txt (так на Windows).
 * Без плоского файла GitHub Pages ответит 404, и переходы между страницами станут полной перезагрузкой.
 * Копируем вложенные файлы в плоские имена (если плоского еще нет): на Linux этот шаг ничего не меняет.
 */
function flattenSegmentFiles(dir) {
  let copied = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("__next.")) {
      const walk = (d, rel) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) walk(p, [...rel, e.name]);
          else {
            const flat = path.join(dir, [entry.name, ...rel, e.name].join("."));
            if (!fs.existsSync(flat)) {
              fs.copyFileSync(p, flat);
              copied++;
            }
          }
        }
      };
      walk(full, []);
    } else if (entry.name !== "_next") {
      copied += flattenSegmentFiles(full);
    }
  }
  return copied;
}

function writeExtras() {
  const flat = flattenSegmentFiles(out);
  if (flat) console.log(`Плоские файлы данных страниц: ${flat}`);
  fs.writeFileSync(path.join(out, ".nojekyll"), "");
  fs.writeFileSync(path.join(out, "index.html"), rootPage());
  fs.writeFileSync(path.join(out, "404.html"), notFoundPage());
}

function head(title, extra = "") {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0F0F11">
<title>${title}</title>
<link rel="icon" href="${basePath}/icon.png" type="image/png">
${extra}
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;overflow-x:clip;overscroll-behavior-y:none;background:#0F0F11;color:#fff;
  font-family:Onest,"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;line-height:1.7}
.wrap{min-height:100svh;display:grid;place-items:center;padding:32px 20px;text-align:center;
  background:radial-gradient(60% 50% at 50% 0%,rgba(255,199,0,.16),transparent 70%),#0F0F11}
.box{max-width:560px}
.logo{width:min(260px,70vw);height:auto;margin:0 auto 28px;display:block}
h1{font-family:"Playfair Display",Georgia,"Times New Roman",serif;font-weight:500;letter-spacing:-.03em;line-height:1.15;
  font-size:clamp(28px,6vw,40px);margin:0 0 12px}
p{margin:0 0 24px;color:rgba(255,255,255,.78)}
.btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
a.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 28px;border-radius:999px;
  font-weight:600;text-decoration:none;color:#0F0F11;background:#FFC700;
  box-shadow:0 1px 0 rgba(255,255,255,.4) inset,0 10px 24px -8px rgba(255,199,0,.45);
  transition:transform .2s cubic-bezier(.34,1.56,.64,1)}
a.btn:hover{transform:translateY(-2px)}
a.btn:active{transform:translateY(0) scale(.98)}
a.btn:focus-visible{outline:3px solid #fff;outline-offset:3px}
a.btn.ghost{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.5)}
</style>
</head>`;
}

/** Корень сайта (/run/): выбирает язык по настройкам браузера и сохраняет UTM-метки и якорь */
function rootPage() {
  const ru = `${basePath}/ru/`;
  const kk = `${basePath}/kk/`;
  return `${head(
    "RUH Construction: ремонт под ключ в Алматы",
    `<meta name="description" content="RUH Construction: ремонт квартир и коммерческих помещений под ключ в Алматы. Жөндеу Алматыда.">
<link rel="canonical" href="${siteUrl}/ru/">
<link rel="alternate" hreflang="ru" href="${siteUrl}/ru/">
<link rel="alternate" hreflang="kk" href="${siteUrl}/kk/">
<link rel="alternate" hreflang="x-default" href="${siteUrl}/ru/">
<script>
(function(){var l=((navigator.languages&&navigator.languages[0])||navigator.language||"ru").toLowerCase();
var to=l.indexOf("kk")===0?"${kk}":"${ru}";location.replace(to+location.search+location.hash)})();
</script>
<noscript><meta http-equiv="refresh" content="0;url=${ru}"></noscript>`,
  )}
<body>
<main class="wrap"><div class="box">
<img class="logo" src="${basePath}/brand/logo-h-dark.svg" alt="RUH Construction" width="260" height="69">
<h1>RUH Construction</h1>
<p>Ремонт под ключ в Алматы<br>Алматыда пәтер мен кеңселерді кілтке дейін жөндеу</p>
<div class="btns"><a class="btn" href="${ru}">Русский</a><a class="btn ghost" href="${kk}">Қазақша</a></div>
</div></main>
</body>
</html>
`;
}

/** 404 для GitHub Pages: два языка сразу, ссылки ведут на главные страницы /ru/ и /kk/ */
function notFoundPage() {
  return `${head("404 | RUH Construction", `<meta name="robots" content="noindex">`)}
<body>
<main class="wrap"><div class="box">
<img class="logo" src="${basePath}/brand/logo-h-dark.svg" alt="RUH Construction" width="260" height="69">
<h1>Страница не найдена</h1>
<p>Возможно, ссылка устарела или в адресе опечатка.</p>
<h1 lang="kk" style="margin-top:28px">Бет табылмады</h1>
<p lang="kk">Сілтеме ескірген немесе мекенжайда қате болуы мүмкін.</p>
<div class="btns"><a class="btn" href="${basePath}/ru/">На главную</a><a class="btn ghost" href="${basePath}/kk/">Басты бетке</a></div>
</div></main>
</body>
</html>
`;
}
