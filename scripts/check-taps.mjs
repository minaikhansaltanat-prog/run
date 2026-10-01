// Проверка "кнопки нажимаются": npm run check:taps  (нужен запущенный сайт на :3000 или --base=...)
// Для каждой ссылки, кнопки и поля формы на странице: прокручивает элемент в три разных места экрана
// (выше центра, центр, ниже центра) и смотрит, что лежит в точке его центра. Если там другой элемент
// (прозрачный контейнер плавающей кнопки, шапка, панель), нажатие до кнопки не дойдет: такой элемент выводится как ошибка.
// Параметры: --base=http://localhost:3000  --paths=/,/kk,/calculator  --widths=360,390,1440
import puppeteer from "puppeteer";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.slice(2).split("=")),
);
const base = args.base || "http://localhost:3000";
const paths = (args.paths || "/,/kk,/gallery,/calculator,/kk/calculator,/objects/kvartira-svetlyy-interer,/privacy").split(",");
const widths = (args.widths || "360,390,768,1440").split(",").map(Number);

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
let failed = 0;
try {
  for (const path of paths) {
    for (const w of widths) {
      const page = await browser.newPage();
      const mobile = w < 768;
      await page.setViewport({ width: w, height: mobile ? 780 : 900, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
      await page.goto(base + path, { waitUntil: "networkidle2", timeout: 120000 });
      // подгружаем отложенные блоки (калькулятор, плавающая кнопка)
      await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = "auto";
        for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 1200));
      });
      const bad = await page.evaluate(() => {
        const root = document.documentElement;
        const vw = root.clientWidth;
        const vh = window.innerHeight;
        const sel = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="radio"], label.check';
        const out = [];
        const name = (el) =>
          `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""}${el.textContent ? ` "${el.textContent.trim().slice(0, 24)}"` : ""}`;
        const els = [...document.querySelectorAll(sel)].filter((el) => {
          if (el.closest('[inert], [aria-hidden="true"], .skip-link, .hp-field, .visually-hidden, .drawer:not([data-open="true"])')) return false;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none" || cs.pointerEvents === "none") return false;
          const r = el.getBoundingClientRect();
          return r.width > 4 && r.height > 4;
        });
        for (const el of els) {
          const fixed = (() => {
            for (let p = el; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).position === "fixed") return true;
            return false;
          })();
          const positions = fixed ? [null] : [0.3, 0.5, 0.65];
          for (const pos of positions) {
            if (pos !== null) {
              const r0 = el.getBoundingClientRect();
              window.scrollTo(0, window.scrollY + r0.top + r0.height / 2 - vh * pos);
            }
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            if (cx < 0 || cx > vw || cy < 0 || cy > vh) continue; // вне экрана (лента, которую листают)
            const top = document.elementFromPoint(cx, cy);
            if (!top) continue;
            if (top === el || el.contains(top) || top.contains(el)) continue;
            // подпись и поле формы нажимаются вместе
            if (top.closest("label") && (top.closest("label") === el.closest("label") || top.closest("label").contains(el))) continue;
            // шапка и нижняя панель перекрывают край экрана: это нормально, если кнопка у самого края
            const coverFixed = top.closest(".site-header, .mobile-bar");
            if (coverFixed && (cy < 90 || cy > vh - 90)) continue;
            out.push(`${name(el)} закрыт элементом ${name(top)} (y=${Math.round(cy)} из ${vh})`);
            break;
          }
        }
        return [...new Set(out)].slice(0, 6);
      });
      if (bad.length) failed++;
      console.log(`${bad.length ? "FAIL" : "ok  "} ${String(w).padStart(4)}px ${path}${bad.length ? "\n      " + bad.join("\n      ") : ""}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failed ? `\nПроблем: ${failed}` : "\nВсе кнопки и ссылки нажимаются: ничто их не перекрывает");
process.exit(failed ? 1 : 0);
