// Open Graph картинки 1200x630 (ТЗ 7.5: obsidian, печать B по центру/справа + короткое УТП) для ru и kk.
// Запуск: node scripts/build-og.mjs  ->  public/og-ru.jpg, public/og-kk.jpg
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const texts = {
  ru: {
    fs: 68,
    a: "Ремонт под ключ.",
    b: "Одна команда.",
    c: "Один ответственный.",
    sub: "Квартиры, офисы, рестораны в Алматы",
    rating: "5.0 на 2ГИС · 23 оценки",
  },
  kk: {
    fs: 58,
    a: "Кілтке дейін жөндеу.",
    b: "Бір команда.",
    c: "Бір жауапты.",
    sub: "Алматыдағы пәтерлер, кеңселер, мейрамханалар",
    rating: "2ГИС-те 5.0 · 23 баға",
  },
};

const html = (t) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:PF;src:url(${u("src/fonts/playfair-display.woff2")});font-weight:400 700;font-style:normal}
@font-face{font-family:PF;src:url(${u("src/fonts/playfair-display-italic.woff2")});font-weight:400 700;font-style:italic}
@font-face{font-family:ON;src:url(${u("src/fonts/onest.woff2")});font-weight:400 700}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:
 radial-gradient(760px 460px at 92% -10%,rgba(255,199,0,.30),transparent 62%),
 radial-gradient(640px 440px at 0% 115%,rgba(250,174,59,.16),transparent 62%),#0F0F11;
 color:#fff;font-family:ON,sans-serif;position:relative;overflow:hidden}
.grain{position:absolute;inset:0;opacity:.5;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.copy{position:absolute;left:84px;top:96px;width:660px}
.eyebrow{font-size:20px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#FFC700;margin-bottom:26px}
h1{font-family:PF,serif;font-weight:500;font-size:${t.fs}px;line-height:1.1;letter-spacing:-.03em}
h1 span{display:block}
h1 i{color:#FFC700;font-style:italic}
.sub{margin-top:30px;font-size:26px;line-height:1.4;color:rgba(255,255,255,.82);max-width:520px}
.rating{position:absolute;left:84px;bottom:44px;font-size:22px;font-weight:600;color:rgba(255,255,255,.9)}
.rating b{color:#FFC700}
.seal{position:absolute;right:70px;top:95px;width:440px;height:440px}
</style></head><body><div class="grain"></div>
<div class="copy"><div class="eyebrow">RUH Construction</div>
<h1><span>${t.a}</span><span>${t.b}</span><span><i>${t.c}</i></span></h1>
<p class="sub">${t.sub}</p></div>
<div class="rating"><b>&#9733;</b> ${t.rating}</div>
<img class="seal" src="${u("public/brand/seal-1200.webp")}" alt="">
</body></html>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--allow-file-access-from-files"] });
try {
  const tmp = path.join(root, "scripts", "_og.html");
  for (const l of ["ru", "kk"]) {
    fs.writeFileSync(tmp, html(texts[l]));
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(root, "public", `og-${l}.jpg`), type: "jpeg", quality: 90 });
    await page.close();
    console.log("og", l);
  }
  fs.rmSync(tmp, { force: true });
} finally {
  await browser.close();
}
