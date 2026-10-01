// Локальная проверка статической сборки так, как ее отдает GitHub Pages: npm run serve:static
//   - сайт лежит в подпапке (по умолчанию /run), как на https://имя.github.io/run/
//   - /ru/gallery без слеша перенаправляется на /ru/gallery/ (301)
//   - неизвестный адрес получает 404.html со статусом 404
// Параметры: PORT (3000), BASE_PATH (/run; пусто для своего домена)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");
const port = Number(process.env.PORT || 3000);
const base = (process.env.BASE_PATH ?? "/run").replace(/\/$/, "");

if (!fs.existsSync(path.join(out, "index.html"))) {
  console.error("Папки out нет. Сначала: npm run build:static");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

function send(res, code, file, extra = {}) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(code, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "no-cache", ...extra });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      res.writeHead(400).end();
      return;
    }
    let p = decodeURIComponent(url.pathname);
    if (base && !(p === base || p.startsWith(base + "/"))) {
      // как на github.io: вне подпапки сайта ничего нет
      res.writeHead(302, { Location: `${base}/` }).end();
      return;
    }
    p = p.slice(base.length) || "/";
    const file = path.normalize(path.join(out, p));
    if (!file.startsWith(out)) {
      res.writeHead(403).end();
      return;
    }
    let stat = fs.existsSync(file) ? fs.statSync(file) : null;
    if (stat?.isDirectory()) {
      if (!p.endsWith("/")) {
        res.writeHead(301, { Location: `${base}${p}/${url.search}` }).end();
        return;
      }
      const idx = path.join(file, "index.html");
      if (fs.existsSync(idx)) return send(res, 200, idx);
      stat = null;
    } else if (stat) {
      return send(res, 200, file);
    }
    send(res, 404, path.join(out, "404.html"));
  })
  .listen(port, () => console.log(`Статический сайт: http://localhost:${port}${base}/  (папка out)`));
