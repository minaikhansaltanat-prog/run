// Контраст текста на фото hero (ТЗ раздел 12): npm run check:contrast  (нужен запущенный сервер на :3000)
// Метод: прячем текст, снимаем фон под каждым элементом, берем самые светлые 5% пикселей фона (худший случай
// для светлого текста) и считаем коэффициент контраста WCAG с реальным цветом текста. Порог 4.5:1.
// Проверяется hero на 1440 и 390, для ru и kk.
import puppeteer from "puppeteer";
import sharp from "sharp";

const base = process.env.BASE || "http://localhost:3000";
const THRESHOLD = 4.5; // белый и мелкий текст
const LARGE_TEXT_THRESHOLD = 3; // крупный золотой H1 (WCAG AA для текста от 24 px)
const SELECTORS = [".hero__eyebrow", ".hero__title > span", ".hero__sub", ".hero__trust", ".glass-badge", ".hero__cta .btn-outline-light"];

const lin = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const parseRgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
let failed = 0;
try {
  for (const path of ["/", "/kk"]) {
    for (const [name, vp] of [
      ["1440", { width: 1440, height: 900 }],
      ["390", { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }],
    ]) {
      const page = await browser.newPage();
      await page.setViewport(vp);
      await page.goto(base + path, { waitUntil: "networkidle2", timeout: 120000 });
      await page.evaluate(() => document.fonts.ready);
      await new Promise((r) => setTimeout(r, 3200)); // ждем окончания анимации входа
      const items = await page.evaluate((sels) => {
        const out = [];
        for (const s of sels) {
          document.querySelectorAll(s).forEach((el, i) => {
            const cs = getComputedStyle(el);
            if (cs.display === "none") return;
            // реальные прямоугольники строк текста (а не ширина блока)
            const range = document.createRange();
            range.selectNodeContents(el);
            const rects = [...range.getClientRects()].filter((r) => r.width > 3 && r.height > 3);
            rects.forEach((r, k) => out.push({ sel: `${s}#${i}.${k}`, x: r.left, y: r.top, w: r.width, h: r.height, color: cs.color }));
          });
        }
        return out;
      }, SELECTORS);
      await page.addStyleTag({ content: ".hero *{color:transparent !important;text-shadow:none !important} .hero svg{opacity:0 !important}" });
      await new Promise((r) => setTimeout(r, 200));
      const shot = await page.screenshot({ type: "png" });
      const meta = await sharp(shot).metadata();
      for (const it of items) {
        const left = Math.max(0, Math.round(it.x));
        const top = Math.max(0, Math.round(it.y));
        const width = Math.min(meta.width - left, Math.round(it.w));
        const height = Math.min(meta.height - top, Math.round(it.h));
        if (width < 2 || height < 2) continue;
        const { data } = await sharp(shot).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const ls = [];
        for (let i = 0; i < data.length; i += 3) ls.push(lum(data[i], data[i + 1], data[i + 2]));
        ls.sort((a, b) => a - b);
        const bg = ls[Math.floor(ls.length * 0.95)];
        const [r, g, b] = parseRgb(it.color);
        const t = lum(r, g, b);
        const ratio = (Math.max(t, bg) + 0.05) / (Math.min(t, bg) + 0.05);
        const need = it.sel.startsWith(".hero__title") && r > 200 && b < 100 ? LARGE_TEXT_THRESHOLD : THRESHOLD;
        const bad = ratio < need;
        if (bad) failed++;
        console.log(`${bad ? "FAIL" : "ok  "} ${path.padEnd(4)} ${name.padStart(4)}px ${it.sel.padEnd(30)} ${ratio.toFixed(2)}:1`);
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failed ? `\nНиже ${THRESHOLD}:1: ${failed}` : `\nВесь текст hero не ниже ${THRESHOLD}:1`);
process.exit(failed ? 1 : 0);
