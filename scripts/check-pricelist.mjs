// Проверка просмотра прайс-листа: npm run check:pricelist  (сайт на :3000 или --base=...; для статики --base=http://localhost:3000/run --path=/ru/)
// Проверяет: окно открывается пальцем и мышью, страницы рисуются на canvas, нет <img>, ссылок на PDF и кнопки скачивания,
// блокируются контекстное меню, перетаскивание, копирование и Ctrl+S / Ctrl+P / Ctrl+C, при уходе из окна страницы размываются,
// Esc закрывает, сеть не запрашивает PDF, а страницы нумеруются при прокрутке.
import puppeteer from "puppeteer";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.slice(2).split("=")),
);
const base = args.base || "http://localhost:3000";
const path = args.path || "/";
const shot = args.shot ? String(args.shot) : "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
let failed = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "ok  " : "FAIL"} ${msg}`);
  if (!cond) failed++;
};

async function run(label, viewport, mobile) {
  const page = await browser.newPage();
  await page.setViewport({ ...viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
  const urls = [];
  const errors = [];
  page.on("request", (r) => urls.push(r.url()));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 600)));
  await page.goto(base + path, { waitUntil: "load", timeout: 120000 });
  await page.waitForSelector(".gift-banner__btn", { timeout: 30000 });
  await sleep(1500);
  await page.evaluate(() => document.querySelector(".gift-banner__btn").scrollIntoView({ block: "center", behavior: "instant" }));
  await sleep(600);
  const pt = await page.evaluate(() => {
    const r = document.querySelector(".gift-banner__btn").getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (mobile) await page.touchscreen.tap(pt.x, pt.y);
  else await page.mouse.click(pt.x, pt.y);
  await page.waitForSelector(".pl-root", { timeout: 20000 });
  ok(true, `${label}: окно просмотра открылось`);

  await page.waitForFunction(() => document.querySelector('.pl-page[data-page="1"]')?.getAttribute("data-state") === "done", { timeout: 30000 });
  const info = await page.evaluate(() => {
    const root = document.querySelector(".pl-root");
    const canvases = [...root.querySelectorAll("canvas")];
    const c = canvases[0];
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4 * 97) if (d[i] < 120) dark++;
    return {
      pages: canvases.length,
      dark,
      imgs: root.querySelectorAll("img").length,
      pdfLinks: document.querySelectorAll('a[download], a[href$=".pdf"], a[href*=".pdf?"], embed, object, iframe').length,
      buttons: [...root.querySelectorAll("button, a")].map((x) => x.textContent.trim()).filter(Boolean),
      text: root.textContent,
    };
  });
  ok(info.pages === 6, `${label}: страниц ${info.pages}`);
  ok(info.dark > 50, `${label}: первая страница нарисована (темных точек: ${info.dark})`);
  ok(info.imgs === 0, `${label}: внутри окна нет <img> (${info.imgs})`);
  ok(info.pdfLinks === 0, `${label}: на странице нет ссылок на PDF, download, embed и iframe`);
  ok(!/скачать|жүктеу|download/i.test(info.buttons.join(" ")), `${label}: нет кнопки "скачать" (${info.buttons.join(" | ")})`);

  // все элементы окна помещаются в экран (не уезжают вправо)
  const fit = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad = [];
    for (const el of document.querySelectorAll(".pl-root .pl-bar > *, .pl-root .pl-page, .pl-root .pl-actions .btn")) {
      const r = el.getBoundingClientRect();
      if (r.left < -1 || r.right > vw + 1)
        bad.push(`${el.className.split(" ")[0] || el.tagName} ${Math.round(r.left)}..${Math.round(r.right)} из ${vw}`);
    }
    return { vw, bad };
  });
  ok(fit.bad.length === 0, `${label}: окно целиком в экране ${fit.vw}px${fit.bad.length ? " (" + fit.bad.join("; ") + ")" : ""}`);

  const prot = await page.evaluate(() => {
    const target = document.querySelector(".pl-page canvas");
    const test = (type, init = {}) => {
      const e =
        type === "keydown"
          ? new KeyboardEvent(type, { cancelable: true, bubbles: true, ...init })
          : new Event(type, { cancelable: true, bubbles: true });
      target.dispatchEvent(e);
      return e.defaultPrevented;
    };
    return {
      contextmenu: test("contextmenu"),
      dragstart: test("dragstart"),
      copy: test("copy"),
      selectstart: test("selectstart"),
      ctrlS: test("keydown", { key: "s", ctrlKey: true }),
      ctrlP: test("keydown", { key: "p", ctrlKey: true }),
      ctrlC: test("keydown", { key: "c", ctrlKey: true }),
      select: getComputedStyle(document.querySelector(".pl-root")).userSelect,
    };
  });
  ok(
    prot.contextmenu && prot.dragstart && prot.copy && prot.selectstart,
    `${label}: контекстное меню, перетаскивание, копирование и выделение заблокированы`,
  );
  ok(prot.ctrlS && prot.ctrlP && prot.ctrlC, `${label}: Ctrl+S, Ctrl+P, Ctrl+C заблокированы`);
  ok(prot.select === "none", `${label}: выделение текста отключено (user-select: ${prot.select})`);

  // завеса при уходе из окна
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await sleep(150);
  const blurred = await page.evaluate(() => document.querySelector(".pl-root").getAttribute("data-shield"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await sleep(150);
  const unblurred = await page.evaluate(() => document.querySelector(".pl-root").getAttribute("data-shield"));
  ok(blurred === "true" && unblurred === "false", `${label}: при уходе из окна страницы размываются и возвращаются`);

  // PrintScreen
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keyup", { key: "PrintScreen", bubbles: true })));
  await sleep(150);
  ok(
    (await page.evaluate(() => document.querySelector(".pl-root").getAttribute("data-shield"))) === "true",
    `${label}: PrintScreen закрывает страницы завесой`,
  );
  await sleep(2000);

  // прокрутка: номер страницы и подгрузка последней
  await page.evaluate(() => {
    const s = document.querySelector(".pl-scroll");
    s.scrollTo(0, s.scrollHeight);
  });
  await sleep(1500);
  const last = await page.evaluate(() => ({
    page: document.querySelector(".pl-bar__page [aria-hidden]")?.textContent?.trim(),
    state: document.querySelector('.pl-page[data-page="6"]')?.getAttribute("data-state"),
  }));
  ok(last.page === "6 / 6" && last.state === "done", `${label}: после прокрутки счетчик "${last.page}", последняя страница ${last.state}`);

  if (shot) await page.screenshot({ path: `temporary screenshots/${shot}-${label}.png` });

  ok(!urls.some((u) => /\.pdf(\?|$)/i.test(u)), `${label}: сеть не запрашивала PDF`);
  ok(!errors.length, `${label}: ошибок консоли нет${errors.length ? " " + errors.join(" | ") : ""}`);

  await page.keyboard.press("Escape");
  await sleep(300);
  ok(!(await page.$(".pl-root")), `${label}: Esc закрывает окно`);
  await page.close();
}

try {
  if (args.only !== "mobile") await run("desktop", { width: 1440, height: 900 }, false);
  if (args.only !== "desktop") await run("mobile", { width: 390, height: 844 }, true);
} finally {
  await browser.close();
}
console.log(failed ? `\nПроблем: ${failed}` : "\nПросмотр прайс-листа работает, скачать и скопировать его нельзя");
process.exit(failed ? 1 : 0);
