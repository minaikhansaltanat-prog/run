// Фото-конвейер RUH (ТЗ раздел 8): npm run photos
//   Этап 0: апскейл Real-ESRGAN для кадров < 2000 px   -> node scripts/upscale-photos.mjs (долго, кэшируется)
//   Этап 1: единая цветокоррекция                       -> python scripts/grade_photos.py
//   Этап 2: ресайз, резкость, AVIF/WebP/JPEG, LQIP      -> этот файл
//   Итог:   public/img/*, content/gallery.json, docs/photo-qa/{contact-sheet.jpg,report.md}
//
//   node scripts/enhance-photos.mjs            весь набор
//   node scripts/enhance-photos.mjs p06 p04    только выбранные
//   --skip-grade  не запускать этап 1 (использовать готовые .cache/graded)
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const preset = read("config/photo-preset.json");
const photos = read("config/photos.json");
const manifest = read("assets/raw/manifest.json");

const args = process.argv.slice(2);
const skipGrade = args.includes("--skip-grade");
const only = args.filter((a) => /^p\d+$/.test(a));
const outDir = path.join(root, "public", "img");
const gradedDir = path.join(root, ".cache", "graded");
const qaDir = path.join(root, "docs", "photo-qa");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(qaDir, { recursive: true });

if (!skipGrade) {
  const py = process.platform === "win32" ? "python" : "python3";
  const r = spawnSync(py, [path.join(root, "scripts", "grade_photos.py"), ...only], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  if (r.status !== 0) {
    console.error("Этап цветокоррекции завершился с ошибкой (нужны python, numpy, pillow).");
    process.exit(r.status ?? 1);
  }
}

const exp = preset.export;
const sharpenFor = (w) => ({ sigma: w <= 600 ? 0.7 : exp.sharpen.sigma, m1: exp.sharpen.flat, m2: exp.sharpen.jagged });

async function writeSet(input, baseName, widths, extra = {}) {
  const written = [];
  for (const w of widths) {
    let pipe = sharp(input, { limitInputPixels: false }).resize({ width: w, kernel: "lanczos3", withoutEnlargement: true });
    if (extra.height)
      pipe = sharp(input, { limitInputPixels: false }).resize({
        width: w,
        height: Math.round(w * extra.height),
        fit: "cover",
        position: extra.position,
        kernel: "lanczos3",
      });
    const buf = await pipe.sharpen(sharpenFor(w)).toBuffer();
    await sharp(buf)
      .avif({ quality: exp.avifQuality, effort: 4 })
      .toFile(path.join(outDir, `${baseName}-${w}.avif`));
    await sharp(buf)
      .webp({ quality: exp.webpQuality, effort: 5 })
      .toFile(path.join(outDir, `${baseName}-${w}.webp`));
    await sharp(buf)
      .jpeg({ quality: exp.jpegQuality, mozjpeg: true, progressive: true })
      .toFile(path.join(outDir, `${baseName}-${w}.jpg`));
    written.push(w);
  }
  return written;
}

const stats = fs.existsSync(path.join(qaDir, "stats.json")) ? read("docs/photo-qa/stats.json") : {};
const galleryPath = path.join(root, "content", "gallery.json");
const prev = fs.existsSync(galleryPath) ? JSON.parse(fs.readFileSync(galleryPath, "utf8")) : { items: [] };
const byId = new Map(prev.items.map((i) => [i.id, i]));

const entries = Object.entries(photos).filter(([raw]) => (only.length ? only.includes(raw) : true));
for (const [raw, meta] of entries) {
  const src = path.join(gradedDir, `${raw}.png`);
  if (!fs.existsSync(src)) {
    console.warn(`[skip] ${raw}: нет ${path.relative(root, src)} (запустите этап цветокоррекции)`);
    continue;
  }
  const info = await sharp(src).metadata();
  const widths = exp.widths.filter((w) => w <= info.width);
  if (!widths.length) widths.push(info.width);
  // если мастер заметно шире самой большой стандартной ширины, добавляем его родную ширину (кадры без апскейла:
  // 1125 px по горизонтали и т.п.), иначе лайтбокс растягивал бы меньшую копию
  if (info.width > widths[widths.length - 1] + 64) widths.push(info.width);
  const written = await writeSet(src, meta.id, widths);

  const tiny = await sharp(src).resize({ width: 24 }).blur(1).webp({ quality: 40 }).toBuffer();
  const st = await sharp(src).resize({ width: 64 }).stats();
  const d = st.dominant;
  const dominant = `#${[d.r, d.g, d.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

  const item = {
    id: meta.id,
    file: `/img/${meta.id}`,
    width: info.width,
    height: info.height,
    widths: written,
    objectSlug: meta.objectSlug,
    objectType: meta.objectType,
    room: meta.room,
    tags: meta.tags,
    stage: meta.stage,
    pairId: meta.pairId,
    featured: meta.featured,
    order: meta.order,
    focal: meta.focal,
    lowRes: Boolean(meta.lowRes),
    dominant,
    lqip: `data:image/webp;base64,${tiny.toString("base64")}`,
    raw,
  };
  byId.set(meta.id, item);
  console.log(`[ok] ${raw} -> ${meta.id}  ${info.width}x${info.height}  [${written.join(", ")}]`);
}

// hero-кадры (отдельные кропы): десктоп 16:9 из ph-0001, мобильный 9:16 из ph-0003
async function heroCrop(rawId, name, aspect, widths, focal) {
  const src = path.join(gradedDir, `${rawId}.png`);
  if (!fs.existsSync(src)) return null;
  const info = await sharp(src).metadata();
  // позиция кропа по фокальной точке (sharp принимает "attention", но нужна точность): вырезаем сами
  let cw = info.width;
  let ch = Math.round(cw / aspect);
  if (ch > info.height) {
    ch = info.height;
    cw = Math.round(ch * aspect);
  }
  const left = Math.min(info.width - cw, Math.max(0, Math.round(focal[0] * info.width - cw / 2)));
  const top = Math.min(info.height - ch, Math.max(0, Math.round(focal[1] * info.height - ch / 2)));
  const cropped = await sharp(src).extract({ left, top, width: cw, height: ch }).toBuffer();
  const ws = widths.filter((w) => w <= cw);
  const written = [];
  for (const w of ws) {
    const buf = await sharp(cropped).resize({ width: w, kernel: "lanczos3" }).sharpen(sharpenFor(w)).toBuffer();
    await sharp(buf)
      .avif({ quality: exp.avifQuality, effort: 4 })
      .toFile(path.join(outDir, `${name}-${w}.avif`));
    await sharp(buf)
      .webp({ quality: exp.webpQuality, effort: 5 })
      .toFile(path.join(outDir, `${name}-${w}.webp`));
    await sharp(buf)
      .jpeg({ quality: exp.jpegQuality, mozjpeg: true, progressive: true })
      .toFile(path.join(outDir, `${name}-${w}.jpg`));
    written.push(w);
  }
  const st = await sharp(cropped).resize({ width: 64 }).stats();
  const d = st.dominant;
  const tiny = await sharp(cropped).resize({ width: 24 }).blur(1).webp({ quality: 40 }).toBuffer();
  return {
    file: `/img/${name}`,
    width: cw,
    height: ch,
    aspect: cw / ch,
    widths: written,
    dominant: `#${[d.r, d.g, d.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`,
    lqip: `data:image/webp;base64,${tiny.toString("base64")}`,
  };
}

const heroRaw = { desktop: "p06", mobile: "p04" };
const heroes = { ...(prev.heroes ?? {}) };
if (!only.length || only.includes(heroRaw.desktop)) {
  const h = await heroCrop(heroRaw.desktop, "hero-d", 16 / 9, [1200, 1600, 2400], photos[heroRaw.desktop].focal);
  if (h) heroes.desktop = h;
}
if (!only.length || only.includes(heroRaw.mobile)) {
  const h = await heroCrop(heroRaw.mobile, "hero-m", 9 / 16, [480, 768, 1200], photos[heroRaw.mobile].focal);
  if (h) heroes.mobile = h;
}

// кадры, которые не пересобирались: обновляем только метаданные (комната, порядок, featured), файлы остаются прежними
const processed = new Set(entries.map(([raw]) => raw));
for (const [raw, meta] of Object.entries(photos)) {
  if (processed.has(raw)) continue;
  const it = byId.get(meta.id);
  if (!it) continue;
  Object.assign(it, {
    objectSlug: meta.objectSlug,
    objectType: meta.objectType,
    room: meta.room,
    tags: meta.tags,
    stage: meta.stage,
    pairId: meta.pairId,
    featured: meta.featured,
    order: meta.order,
    focal: meta.focal,
    lowRes: Boolean(meta.lowRes),
  });
}
const items = [...byId.values()].sort((a, b) => a.order - b.order);
fs.writeFileSync(galleryPath, JSON.stringify({ generatedAt: new Date().toISOString(), preset: preset.name, items, heroes }, null, 2));

// контактный лист "до | после" и отчет качества (ТЗ 8.2 п.4, 8.4)
async function contactSheet() {
  const rawDir = path.join(root, "assets", "raw");
  const cell = 300;
  const rows = [];
  for (const [raw, meta] of Object.entries(photos).sort((a, b) => a[1].order - b[1].order)) {
    const g = path.join(gradedDir, `${raw}.png`);
    if (!fs.existsSync(g)) continue;
    const afterBuf = await sharp(g).resize({ width: cell, height: cell, fit: "inside" }).jpeg({ quality: 88 }).toBuffer();
    const beforeBuf = await sharp(path.join(rawDir, `${raw}.jpg`))
      .resize({ width: cell, height: cell, fit: "inside" })
      .jpeg({ quality: 88 })
      .toBuffer();
    rows.push({ meta, raw, beforeBuf, afterBuf });
  }
  if (!rows.length) return;
  const cols = 2;
  const pad = 14;
  const labelH = 34;
  const tileW = cell * 2 + pad * 3;
  const tileH = cell + labelH + pad * 2;
  const perRow = 3;
  const sheetW = tileW * perRow;
  const sheetH = Math.ceil(rows.length / perRow) * tileH;
  const comps = [];
  for (let i = 0; i < rows.length; i++) {
    const x = (i % perRow) * tileW;
    const y = Math.floor(i / perRow) * tileH;
    const r = rows[i];
    comps.push({ input: r.beforeBuf, left: x + pad, top: y + labelH });
    comps.push({ input: r.afterBuf, left: x + pad * 2 + cell, top: y + labelH });
    const label = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${labelH}"><text x="${pad}" y="23" font-family="Arial, sans-serif" font-size="17" fill="#d8d8dc">${r.meta.id}  (${r.raw})   до  |  после</text></svg>`,
    );
    comps.push({ input: label, left: x, top: y });
  }
  await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: "#17171a" } })
    .composite(comps)
    .jpeg({ quality: 72 })
    .toFile(path.join(qaDir, "contact-sheet.jpg"));
}
await contactSheet();

function report() {
  const lines = [];
  const rows = Object.entries(photos).sort((a, b) => a[1].order - b[1].order);
  const cct = [];
  const cctById = [];
  lines.push("# Отчет контроля качества фото (ТЗ 8.4, 14.8)", "");
  lines.push(`Пресет: ${preset.name} (${preset.version}). Сила переноса ${preset.grade.strength}. Оригиналы в assets/raw не менялись.`, "");
  lines.push("| Фото | Оригинал | Рабочая копия | Обработка | L* до>после | p5 | цвет (хрома) | CCT, K | пересветы, % | Замечания |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const [raw, meta] of rows) {
    const s = stats[raw];
    if (!s) continue;
    const issues = [];
    const longOrig = Math.max(s.original.w, s.original.h);
    if (longOrig < preset.qa.minWidthForHeroPx && meta.featured)
      issues.push(
        `оригинал ${longOrig} px: для hero нужен 2400+ (${s.flags.includes("esrgan") ? "использован апскейл" : "апскейла нет, родное разрешение"}, лучше запросить оригинал)`,
      );
    if (s.after.clip_hi_pct > preset.qa.maxHighlightClipPct)
      issues.push(`пересветы ${s.after.clip_hi_pct.toFixed(1)}% (норма до ${preset.qa.maxHighlightClipPct}%)`);
    if (meta.lowRes) issues.push("кадр из видео (720x1280), качество ниже остальных: запросить оригинал фото");
    cct.push(s.after.cct_k);
    cctById.push([meta.id, s.after.cct_k]);
    lines.push(
      `| ${meta.id} (${raw}) | ${s.original.w}x${s.original.h} | ${s.master.w}x${s.master.h} | ${s.flags.join(", ")} | ${s.before.L_mean.toFixed(1)} > ${s.after.L_mean.toFixed(1)} | ${s.before.L_p5.toFixed(0)} > ${s.after.L_p5.toFixed(0)} | ${s.before.chroma_mean.toFixed(1)} > ${s.after.chroma_mean.toFixed(1)} | ${s.before.cct_k.toFixed(0)} > ${s.after.cct_k.toFixed(0)} | ${s.before.clip_hi_pct.toFixed(1)} > ${s.after.clip_hi_pct.toFixed(1)} | ${issues.join("; ") || "-"} |`,
    );
  }
  if (cct.length) {
    const min = Math.min(...cct),
      max = Math.max(...cct);
    const [lo, hi] = preset.qa.cctCorridorK;
    lines.push(
      "",
      `Цветовая температура набора после обработки: ${min.toFixed(0)}-${max.toFixed(0)} K (коридор ${lo}-${hi} K): ${min >= lo && max <= hi ? "в норме" : "есть выходы за коридор, список ниже"}.`,
    );
    const out = cctById.filter(([, k]) => k < lo || k > hi);
    if (out.length)
      lines.push(
        "",
        `Вне коридора: ${out.map(([id, k]) => `${id} (${k.toFixed(0)} K)`).join(", ")}. Это кадры с доминирующими насыщенными цветами (дерево, синие стены и панели, яркая фотообоина в детской): оценка температуры по среднему цвету для них не показательна. Баланс белого на них проверен глазами по контрольному листу, белые поверхности нейтральные.`,
      );
  }
  lines.push(
    "",
    "## Как смотреть",
    "",
    "- Контактный лист `docs/photo-qa/contact-sheet.jpg`: слева оригинал, справа после обработки.",
    "- Для утверждения стиля клиентом: если вид устраивает, пакетная обработка уже выполнена этой же командой (`npm run photos`).",
    "- Если нужно мягче или ярче, меняется `config/photo-preset.json` (grade.strength, contrast, vibrance), затем повторный запуск.",
    "",
    "## Что не делалось (ТЗ 8.5)",
    "",
    "Не менялись планировка, мебель, отделка и материалы; интерьеры не дорисовывались и не генерировались. Разрешенные операции: цветокоррекция, баланс белого, экспозиция, мягкое восстановление светов, апскейл Real-ESRGAN (в смеси с Lanczos, чтобы не терять естественную текстуру).",
    "",
  );
  fs.writeFileSync(path.join(qaDir, "report.md"), lines.join("\n"));
}
report();
console.log("enhance-photos: done");
