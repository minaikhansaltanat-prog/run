// Локальный сервер сайта на http://localhost:3000 (правило CLAUDE.md: скриншоты только с localhost).
//   node serve.mjs          режим разработки (next dev)
//   node serve.mjs --prod   собранная версия (нужен npm run build), ближе к боевой скорости
// Если сервер уже запущен, второй экземпляр не стартует.
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 3000);
const root = path.dirname(fileURLToPath(import.meta.url));
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const mode = process.argv.includes("--prod") ? "start" : "dev";

function isUp() {
  return new Promise((resolve) => {
    const req = http.get({ host: "localhost", port: PORT, path: "/", timeout: 1500 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

if (await isUp()) {
  console.log(`Сервер уже запущен: http://localhost:${PORT}`);
  process.exit(0);
}

console.log(`Запуск next ${mode} на http://localhost:${PORT} ...`);
const child = spawn(process.execPath, [nextBin, mode, "-p", String(PORT)], { cwd: root, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
