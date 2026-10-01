// Проверка "сайт не уезжает вправо-влево": npm run check:overflow  (нужен запущенный сервер на :3000)
// Для каждой страницы и ширины 360, 390, 768, 1024, 1440, 1920:
//   - прокручивает страницу целиком (срабатывают отложенные блоки),
//   - проверяет scrollWidth страницы и ищет элементы, вылезающие за правый край,
//   - собирает ошибки консоли и неудачные запросы.
// Параметры: --base=http://localhost:3000  --paths=/,/kk,/gallery  --widths=360,390
import puppeteer from "puppeteer";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.slice(2).split("=")),
);
const base = args.base || "http://localhost:3000";
const paths = (
  args.paths ||
  "/,/kk,/gallery,/kk/gallery,/calculator,/kk/calculator,/objects/kvartira-svetlyy-interer,/kk/objects/kvartira-sanuzly-i-holl,/privacy,/kk/privacy"
).split(",");
const widths = (args.widths || "360,390,768,1024,1440,1920").split(",").map(Number);

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
let failed = 0;
try {
  for (const path of paths) {
    for (const w of widths) {
      const page = await browser.newPage();
      const mobile = w < 768;
      await page.setViewport({ width: w, height: mobile ? 800 : 900, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
      const problems = [];
      page.on("console", (m) => {
        if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 200)}`);
      });
      page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));
      page.on("requestfailed", (r) => problems.push(`request failed: ${r.url().slice(0, 120)}`));
      page.on("response", (r) => {
        if (r.status() >= 400 && !r.url().includes("favicon")) problems.push(`HTTP ${r.status()}: ${r.url().slice(0, 120)}`);
      });
      try {
        await page.goto(base + path, { waitUntil: "networkidle2", timeout: 120000 });
        await page.evaluate(async () => {
          const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
        });
        const r = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
          const offenders = [];
          for (const el of document.querySelectorAll("body *")) {
            const b = el.getBoundingClientRect();
            if (b.width === 0 || b.height === 0) continue;
            const cs = getComputedStyle(el);
            if (cs.position === "fixed" || cs.visibility === "hidden") continue;
            // потомки fixed-элементов (плавающая кнопка с волнами) на ширину страницы не влияют
            if (el.closest(".fab, .lightbox, .dialog-root, .mobile-bar, .drawer, .site-header")) continue;
            // элементы внутри прокручиваемых лент (чипы, карусель) не считаем: их ширина ограничена контейнером
            let p = el.parentElement,
              clipped = false;
            while (p && p !== document.body) {
              const ps = getComputedStyle(p);
              if (/(auto|scroll|hidden|clip)/.test(ps.overflowX) && p.getBoundingClientRect().right <= vw + 1) {
                clipped = true;
                break;
              }
              p = p.parentElement;
            }
            if (!clipped && b.right > vw + 1)
              offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} right=${Math.round(b.right)}`);
          }
          return { vw, sw, offenders: offenders.slice(0, 5), bodyMargin: getComputedStyle(document.body).marginLeft };
        });
        const overflow = r.sw > r.vw + 1 || r.offenders.length > 0;
        const bad = overflow || problems.length > 0;
        if (bad) failed++;
        console.log(
          `${bad ? "FAIL" : "ok  "} ${String(w).padStart(4)}px ${path}` +
            (overflow ? `  scrollWidth=${r.sw} > ${r.vw}  ${r.offenders.join("; ")}` : "") +
            (problems.length ? `\n      ${[...new Set(problems)].slice(0, 4).join("\n      ")}` : ""),
        );
      } catch (e) {
        failed++;
        console.log(`FAIL ${w}px ${path}: ${String(e).slice(0, 160)}`);
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failed ? `\nПроблем: ${failed}` : "\nВсе страницы без горизонтального переполнения и без ошибок консоли");
process.exit(failed ? 1 : 0);
