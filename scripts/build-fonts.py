#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сборка самохостных шрифтов сайта (woff2) + обязательный glyph-check казахских букв (ТЗ 7.3).

Шрифты:
  Playfair Display (заголовки): прямой и курсив, вес 400-700 (OFL)
  Onest (текст, интерфейс, цифры): вес 400-700, есть знак тенге ₸ (OFL)

Исходники .ttf скачивает скрипт из google/fonts в .cache/fonts (не коммитятся).
Результат: src/fonts/*.woff2 (коммитятся, около 150-200 КБ суммарно) и docs/font-glyph-check.md

Запуск: python scripts/build-fonts.py
"""
import io
import sys
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "fonts"
OUT = ROOT / "src" / "fonts"
DOCS = ROOT / "docs"
BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl"

SOURCES = {
    "PlayfairDisplay.ttf": f"{BASE}/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
    "PlayfairDisplay-Italic.ttf": f"{BASE}/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf",
    "Onest.ttf": f"{BASE}/onest/Onest%5Bwght%5D.ttf",
}

KAZAKH = "ӘәҒғҚқҢңӨөҰұҮүҺһІі"
RUSSIAN = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя"
LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
SYMBOLS = "0123456789₸№«»“”„…·×²≈→−%+-/:;,.!?()@#&'\"₽€"

# Юникод-диапазоны подмножества: латиница, Latin-1, кириллица (в нее входят все казахские буквы), знаки
UNICODES = (
    list(range(0x0020, 0x007F))
    + list(range(0x00A0, 0x0100))
    + list(range(0x0400, 0x0500))
    + [0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E,
       0x2022, 0x2026, 0x2030, 0x2116, 0x20AC, 0x20B8, 0x20BD, 0x2190, 0x2192, 0x2212, 0x2248, 0x2260]
)
FEATURES = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "case", "tnum", "pnum", "lnum", "onum", "ss01"]


def fetch(name):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if not path.exists():
        print("download", name)
        req = urllib.request.Request(SOURCES[name], headers={"User-Agent": "Mozilla/5.0"})
        path.write_bytes(urllib.request.urlopen(req, timeout=60).read())
    return path


def missing(font, chars):
    cmap = font.getBestCmap()
    return [c for c in chars if ord(c) not in cmap]


def build(name, out_name, wght_range):
    font = TTFont(fetch(name), lazy=False)
    opts = subset.Options()
    opts.layout_features = FEATURES
    opts.name_IDs = [1, 2, 3, 4, 6]
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    # ограничить ось веса уже после подмножества (меньше файл)
    font = instancer.instantiateVariableFont(font, {"wght": wght_range}, inplace=False)
    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    data = buf.getvalue()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / out_name).write_bytes(data)
    return out_name, len(data), font


def build_static_ttf(name, out_name, wght):
    """Статический TTF для PDF (react-pdf не умеет переменные шрифты): подмножество + фиксированный вес."""
    font = TTFont(fetch(name), lazy=False)
    opts = subset.Options()
    opts.layout_features = ["kern", "liga", "lnum", "tnum"]
    opts.name_IDs = [1, 2, 3, 4, 6]
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    font = instancer.instantiateVariableFont(font, {"wght": wght}, inplace=False)
    pdf_dir = OUT / "pdf"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    font.save(pdf_dir / out_name)
    return (pdf_dir / out_name).stat().st_size


def glyph_check(label, font):
    """Проверка уже собранного файла: казахские, русские, символы."""
    cmap = font.getBestCmap()
    row = {
        "kk": missing(font, KAZAKH),
        "ru": missing(font, RUSSIAN),
        "latin": missing(font, LATIN),
        "symbols": missing(font, SYMBOLS),
    }
    return label, row


def main():
    jobs = [
        ("PlayfairDisplay.ttf", "playfair-display.woff2", 500, "Playfair Display 500 (прямой)"),
        ("PlayfairDisplay-Italic.ttf", "playfair-display-italic.woff2", 500, "Playfair Display 500 (курсив)"),
        ("Onest.ttf", "onest.woff2", (400, 700), "Onest 400-700"),
    ]
    lines = ["# Glyph-check шрифтов (ТЗ 7.3)", "",
             "Проверка на собранных woff2 (то, что реально отдает сайт). `-` значит все буквы на месте.", "",
             "| Файл | Размер | Казахские Ә ә Ғ ғ Қ қ Ң ң Ө ө Ұ ұ Ү ү Һ һ І і | Русские | Латиница | Знаки (₸ № « » … × ² ≈ → −) |",
             "|---|---|---|---|---|---|"]
    failed = False
    for src, out, rng, label in jobs:
        name, size, font = build(src, out, rng)
        _, row = glyph_check(label, font)
        ok = not row["kk"] and not row["ru"] and not row["latin"]
        failed |= not ok
        f = lambda v: "-" if not v else "".join(v)
        lines.append(f"| {label}: {name} | {size/1024:.0f} КБ | {f(row['kk'])} | {f(row['ru'])} | {f(row['latin'])} | {f(row['symbols'])} |")
        print(("OK  " if ok else "FAIL"), name, f"{size/1024:.0f} KB", "symbols missing:", f(row["symbols"]))
    for src, out, w in [("Onest.ttf", "Onest-Regular.ttf", 400), ("Onest.ttf", "Onest-Bold.ttf", 700), ("PlayfairDisplay.ttf", "PlayfairDisplay-Medium.ttf", 500)]:
        size = build_static_ttf(src, out, w)
        print("OK  ", "pdf/" + out, f"{size/1024:.0f} KB")
    lines += ["", "Для PDF-сметы дополнительно собраны статические TTF (src/fonts/pdf): Onest 400 и 700, Playfair Display 500. Те же подмножества, казахские буквы на месте.", "", "Запасной шрифт для знака `₸` в заголовках Playfair не нужен: тенге набирается в Onest (в нем ₸ есть).",
              "Фирменный блочный шрифт логотипа используется только в самом логотипе (SVG)."]
    DOCS.mkdir(parents=True, exist_ok=True)
    (DOCS / "font-glyph-check.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
