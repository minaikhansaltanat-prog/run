// Апскейл Real-ESRGAN (ncnn-vulkan) для фото с длинной стороной < 2000 px (ТЗ 8.3.8).
// Бинарник лежит в tools/realesrgan (не в git). Результаты кэшируются в .cache/esrgan/<id>.png.
// Запуск: node scripts/upscale-photos.mjs   (долго: около 3 минут на фото на слабой видеокарте)
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = path.join(root, "assets", "raw");
const outDir = path.join(root, ".cache", "esrgan");
const exe = path.join(root, "tools", "realesrgan", process.platform === "win32" ? "realesrgan-ncnn-vulkan.exe" : "realesrgan-ncnn-vulkan");
const MIN_LONG_SIDE = 2000;

fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(exe)) {
  console.warn("Real-ESRGAN не найден в tools/realesrgan: пропускаю апскейл (будет Lanczos).");
  process.exit(0);
}

const files = fs
  .readdirSync(rawDir)
  .filter((f) => /\.(jpe?g|png)$/i.test(f))
  .sort();
for (const f of files) {
  const id = path.parse(f).name;
  const out = path.join(outDir, `${id}.png`);
  if (fs.existsSync(out)) {
    console.log(`[skip] ${id} (уже есть)`);
    continue;
  }
  const meta = await sharp(path.join(rawDir, f)).metadata();
  const long = Math.max(meta.width ?? 0, meta.height ?? 0);
  if (long >= MIN_LONG_SIDE) {
    console.log(`[skip] ${id}: ${long}px, апскейл не нужен`);
    continue;
  }
  const t0 = Date.now();
  console.log(`[esrgan] ${id} ${meta.width}x${meta.height} ...`);
  const r = spawnSync(exe, ["-i", path.join(rawDir, f), "-o", out, "-n", "realesrgan-x4plus", "-s", "4"], {
    cwd: path.dirname(exe),
    stdio: ["ignore", "ignore", "pipe"],
  });
  if (r.status !== 0 || !fs.existsSync(out)) {
    console.error(`[fail] ${id}`, r.stderr?.toString().slice(-300));
    continue;
  }
  console.log(`[ok] ${id} за ${Math.round((Date.now() - t0) / 1000)} c`);
}
console.log("upscale: done");
