// Скриншоты через Puppeteer (правило CLAUDE.md). Только http://localhost, не file://.
//   node screenshot.mjs http://localhost:3000 [label] [опции]
// Опции:
//   --w=1440 --h=900      размер окна (по умолчанию 1440x900)
//   --mobile              мобильный режим 390x844, DPR 2, touch
//   --full                снимок всей страницы (перед этим страница прокручивается, чтобы сработали анимации появления)
//   --dpr=1               масштаб пикселей
//   --scroll=1200         прокрутить на N px перед снимком
//   --click=".selector"   кликнуть по элементу перед снимком
//   --wait=600            пауза в мс после загрузки
//   --clip=x,y,w,h        вырезать область
// Файлы: ./temporary screenshots/screenshot-N[-label].png (N растет, ничего не перезаписывается).
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "temporary screenshots");

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.slice(2).split("=");
      return [k, v ?? true];
    }),
);
const positional = args.filter((a) => !a.startsWith("--"));
const url = positional[0] || "http://localhost:3000";
const label = positional[1] ? positional[1].replace(/[^a-zA-Z0-9_-]/g, "-") : "";

if (!/^https?:\/\/localhost(:\d+)?(\/|$)/.test(url)) {
  console.error("Скриншоты делаем только с localhost (например http://localhost:3000). Получено:", url);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const used = fs
  .readdirSync(outDir)
  .map((f) => /^screenshot-(\d+)/.exec(f)?.[1])
  .filter(Boolean)
  .map(Number);
const n = (used.length ? Math.max(...used) : 0) + 1;
const file = path.join(outDir, `screenshot-${n}${label ? `-${label}` : ""}.png`);

const mobile = Boolean(flags.mobile);
const width = Number(flags.w || (mobile ? 390 : 1440));
const height = Number(flags.h || (mobile ? 844 : 900));
const dpr = Number(flags.dpr || (mobile ? 2 : 1));

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  if (mobile) {
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    );
  }
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  await page.evaluate(() => document.fonts?.ready);

  if (flags.full) {
    // прогон по странице: срабатывают IntersectionObserver-анимации и ленивые изображения
    await page.evaluate(async () => {
      const step = Math.max(300, Math.floor(window.innerHeight * 0.6));
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 300));
    });
  }
  if (flags.scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), Number(flags.scroll));
    await new Promise((r) => setTimeout(r, 500));
  }
  if (flags.click) {
    await page.click(String(flags.click));
    await new Promise((r) => setTimeout(r, 700));
  }
  await new Promise((r) => setTimeout(r, Number(flags.wait || 700)));

  const opts = { path: file, fullPage: Boolean(flags.full) };
  if (flags.clip) {
    const [x, y, w, h] = String(flags.clip).split(",").map(Number);
    opts.clip = { x, y, width: w, height: h };
    opts.fullPage = false;
  }
  await page.screenshot(opts);
  console.log(file);
} finally {
  await browser.close();
}
