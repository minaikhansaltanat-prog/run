// Растровые версии бренда из векторных SVG (scripts/build-logo.py) и печати (assets/brand/logo-b.png).
// Выход: favicon.ico, src/app/icon.png, src/app/apple-icon.png, public/brand/*.png|webp
// Запуск: node scripts/build-brand-raster.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brand = path.join(root, "public", "brand");
const appDir = path.join(root, "src", "app");
const OBSIDIAN = "#0F0F11";

const svg = (n) => fs.readFileSync(path.join(brand, n));

async function emblemOnPlate(size, { radius = 0.22, pad = 0.2 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const emblem = await sharp(svg("emblem.svg"), { density: 600 }).resize({ width: inner, height: inner, fit: "inside" }).png().toBuffer();
  const r = Math.round(size * radius);
  const plate = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${OBSIDIAN}"/></svg>`,
  );
  return sharp(plate)
    .composite([{ input: emblem, gravity: "center" }])
    .png()
    .toBuffer();
}

function ico(pngs) {
  // ICO с PNG-вложениями (валидно для всех современных браузеров)
  const n = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(n, 4);
  let offset = 6 + n * 16;
  const dir = [];
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    dir.push(e);
  }
  return Buffer.concat([header, ...dir, ...pngs.map((p) => p.buf)]);
}

async function main() {
  fs.mkdirSync(appDir, { recursive: true });

  // иконки: знак на obsidian
  fs.writeFileSync(path.join(appDir, "icon.png"), await emblemOnPlate(512));
  const apple = await sharp(await emblemOnPlate(180, { radius: 0, pad: 0.17 }))
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(appDir, "apple-icon.png"), apple);
  const sizes = [16, 32, 48];
  const icoPngs = [];
  for (const s of sizes) icoPngs.push({ size: s, buf: await emblemOnPlate(s, { radius: 0.2, pad: 0.12 }) });
  fs.writeFileSync(path.join(appDir, "favicon.ico"), ico(icoPngs));

  // прозрачные PNG логотипов (для PDF, писем, соцсетей)
  for (const n of ["logo-light", "logo-dark", "emblem", "logo-h-light", "logo-h-dark"]) {
    await sharp(svg(`${n}.svg`), { density: 400 })
      .resize({ width: 1200 })
      .png()
      .toFile(path.join(brand, `${n}.png`));
  }

  // печать (версия B): ключуем черный фон в прозрачность, чтобы лежала на obsidian без "квадрата"
  const srcSeal = path.join(root, "assets", "brand", "logo-b.png");
  const meta = await sharp(srcSeal).metadata();
  console.log("seal meta:", meta.width, meta.height, "alpha:", meta.hasAlpha);
  // В исходнике на прозрачном фоне лежит невидимая на черном черная надпись (CONSTRUCTION под RUH).
  // Сначала кладем на черный, потом черный превращаем в прозрачность: на obsidian не остается "призраков".
  const flat = await sharp(srcSeal, { limitInputPixels: false })
    .flatten({ background: "#000000" })
    .resize({ width: 3000 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = flat;
  for (let i = 0; i < data.length; i += 4) {
    const m = Math.max(data[i], data[i + 1], data[i + 2]);
    // яркость как прозрачность: черный -> 0; золото -> почти 255
    const a = Math.min(255, Math.round((m / 235) * 255));
    data[i + 3] = a;
    if (a > 0 && a < 255) {
      const k = 255 / a;
      data[i] = Math.min(255, Math.round(data[i] * k));
      data[i + 1] = Math.min(255, Math.round(data[i + 1] * k));
      data[i + 2] = Math.min(255, Math.round(data[i + 2] * k));
    }
  }
  const base = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  // обрезаем пустые поля вокруг кольца
  const trimmed = await base.png().toBuffer();
  const t = sharp(trimmed).trim({ threshold: 10 });
  for (const w of [320, 640, 1200]) {
    await t
      .clone()
      .resize({ width: w })
      .webp({ quality: 88, alphaQuality: 92 })
      .toFile(path.join(brand, `seal-${w}.webp`));
  }
  console.log("brand raster: done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// зерно (grain) для темных секций: готовая растровая плитка вместо SVG-фильтра feTurbulence (SVG-фильтр дорогой при раскладке)
{
  const size = 192;
  const buf = Buffer.alloc(size * size * 4);
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = 255;
    buf[i * 4 + 1] = 255;
    buf[i * 4 + 2] = 255;
    buf[i * 4 + 3] = Math.floor(rnd() * rnd() * 70);
  }
  await sharp(buf, { raw: { width: size, height: size, channels: 4 } })
    .webp({ quality: 60, alphaQuality: 60 })
    .toFile(path.join(brand, "grain.webp"));
  console.log("grain tile: done");
}
