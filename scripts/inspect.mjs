// Отладка верстки: размеры и позиции элементов по селектору.
//   node scripts/inspect.mjs http://localhost:3000/ ".timeline__line, .timeline__tick" 1440
import puppeteer from "puppeteer";

const [, , url, sel, w = "1440"] = process.argv;
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: Number(w), height: 900 });
await page.goto(url, { waitUntil: "networkidle2" });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 60));
  }
});
const out = await page.evaluate(
  (s) =>
    [...document.querySelectorAll(s)].slice(0, 8).map((e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return {
        el: `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 36)}`,
        top: Math.round(r.top + window.scrollY),
        left: Math.round(r.left),
        w: Math.round(r.width),
        h: Math.round(r.height),
        position: cs.position,
        cssTop: cs.top,
        display: cs.display,
      };
    }),
  sel,
);
console.log(JSON.stringify(out, null, 1));
await browser.close();
