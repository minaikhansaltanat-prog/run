// Проверка калькулятора и плавающей кнопки пальцем (эмуляция телефона): npm run check:calc
// Проходит шаги 1 -> 5 нажатиями "Далее" (touch, как на телефоне), на каждом шаге кнопку ставит в нижнюю
// половину экрана, где у телефона лежит плавающая кнопка, и проверяет, что шаг действительно сменился.
// Затем проверяет, что плавающая кнопка открывает меню и закрывает его нажатием вне меню.
// Параметры: --base=http://localhost:3000  --path=/calculator  --width=360
import puppeteer from "puppeteer";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.slice(2).split("=")),
);
const base = args.base || "http://localhost:3000";
const path = args.path || "/calculator";
const width = Number(args.width || 360);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
let failed = 0;
const fail = (msg) => {
  failed++;
  console.log("FAIL " + msg);
};
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  await page.goto(base + path, { waitUntil: "networkidle2", timeout: 120000 });
  await page.evaluate(() => (document.documentElement.style.scrollBehavior = "auto"));
  await page.waitForSelector(".calc-card__foot .btn-gold", { timeout: 20000 });
  await sleep(1500); // плавающая кнопка подгружается в простое

  const step = () => page.evaluate(() => Number(document.querySelector(".calc")?.getAttribute("data-step")));

  for (let expected = 2; expected <= 5; expected++) {
    // кнопку "Далее" ставим на 65% высоты экрана (там справа лежит плавающая кнопка) и нажимаем пальцем
    const pt = await page.evaluate(() => {
      const b = document.querySelector(".calc-card__foot .btn-gold");
      const r = b.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + r.top + r.height / 2 - innerHeight * 0.65);
      const r2 = b.getBoundingClientRect();
      const cx = r2.left + r2.width / 2;
      const cy = r2.top + r2.height / 2;
      const top = document.elementFromPoint(cx, cy);
      return { cx, cy, ok: top === b || b.contains(top), covered: top ? `${top.tagName}.${String(top.className).split(" ")[0]}` : null };
    });
    if (!pt.ok) fail(`шаг ${expected - 1}: кнопку "Далее" перекрывает ${pt.covered}`);
    await page.touchscreen.tap(pt.cx, pt.cy);
    await sleep(900);
    const now = await step();
    if (now !== expected) fail(`шаг ${expected - 1}: после нажатия "Далее" открыт шаг ${now}, ожидался ${expected}`);
    else console.log(`ok   шаг ${expected - 1} -> ${expected}`);
  }

  // плавающая кнопка: открыть меню, нажать пункт не нужно (ссылки внешние), закрыть нажатием вне меню
  const fab = await page.evaluate(() => {
    const b = document.querySelector(".fab__button");
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  if (!fab) fail("плавающая кнопка не найдена");
  else {
    await page.touchscreen.tap(fab.cx, fab.cy);
    await sleep(700);
    const open = await page.evaluate(() => document.querySelector(".fab")?.getAttribute("data-open"));
    const item = await page.evaluate(() => {
      const a = document.querySelector(".fab__item");
      const r = a.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return a === top || a.contains(top);
    });
    if (open !== "true") fail("плавающая кнопка не открыла меню");
    else if (!item) fail("пункты меню плавающей кнопки перекрыты");
    else console.log("ok   плавающая кнопка открывает меню, пункты нажимаются");
    await page.touchscreen.tap(30, 300);
    await sleep(500);
    const closed = await page.evaluate(() => document.querySelector(".fab")?.getAttribute("data-open"));
    if (closed !== "false") fail("меню плавающей кнопки не закрылось по нажатию вне меню");
    else console.log("ok   меню закрывается нажатием вне него");
  }
  if (errors.length) fail("ошибки консоли: " + [...new Set(errors)].join(" | "));
} finally {
  await browser.close();
}
console.log(failed ? `\nПроблем: ${failed}` : "\nКалькулятор проходится пальцем, плавающая кнопка работает");
process.exit(failed ? 1 : 0);
