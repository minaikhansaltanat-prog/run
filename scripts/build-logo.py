#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сборка векторных логотипов RUH Construction из assets/brand/logo-b.ai (PDF-совместимый .ai).

Что делает:
  1. Достает из .ai векторные контуры букв RUH и CONSTRUCTION (и их тонкие контуры-смещения).
  2. Пересобирает три башни здания как чистые полигоны с градиентами, снятыми с логотипа.
  3. Пишет SVG: emblem, logo-light (на светлом), logo-dark (белая надпись для темного фона).

Запуск: python scripts/build-logo.py
Выход:  public/brand/*.svg  (дальше PNG/favicon делает scripts/build-brand-raster.mjs)
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "brand" / "logo-b.ai"
OUT = ROOT / "public" / "brand"
OUT.mkdir(parents=True, exist_ok=True)

NS = "{http://www.w3.org/2000/svg}"
ET.register_namespace("", "http://www.w3.org/2000/svg")

# Цвета сняты пипеткой с логотипа (см. docs/design-decisions.md)
YELLOW_TOP, YELLOW_BOTTOM = "#FBED21", "#FACA30"
ORANGE_TOP, ORANGE_BOTTOM = "#FAAE3B", "#FACE2E"

# Фасеты башен в координатах SVG (y вниз). Порядок отрисовки как в оригинале.
# (id, точки, тип градиента)
FACETS = [
    ("r-right", [(1218.219, 1249.94), (1317.294, 1249.94), (1317.338, 862.286), (1218.219, 764.54)], "y"),
    ("r-left", [(1119.1, 862.286), (1119.162, 1249.94), (1218.219, 1249.94), (1218.219, 764.54)], "o"),
    ("l-left", [(726.842, 862.374), (726.842, 1249.94), (825.961, 1249.94), (825.961, 764.434)], "y"),
    ("l-right", [(825.961, 1249.94), (925.67, 1249.94), (925.67, 862.894), (825.961, 764.434)], "o"),
    ("m-left", [(889.106, 701.446), (889.106, 1249.94), (1021.264, 1249.94), (1021.264, 571.344)], "y"),
    ("m-right", [(1021.264, 1249.94), (1154.724, 1249.94), (1154.724, 701.439), (1021.264, 571.344)], "m"),
]

GRADIENTS = f"""
  <linearGradient id="gy" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{YELLOW_TOP}"/><stop offset=".2" stop-color="{YELLOW_TOP}"/><stop offset="1" stop-color="{YELLOW_BOTTOM}"/>
  </linearGradient>
  <linearGradient id="go" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{ORANGE_TOP}"/><stop offset="1" stop-color="{ORANGE_BOTTOM}"/>
  </linearGradient>
  <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F9A83B"/><stop offset=".63" stop-color="#FADB28"/><stop offset="1" stop-color="{YELLOW_TOP}"/>
  </linearGradient>
"""


def extract_lettering():
    """Возвращает (ruh_paths, wordmark_paths) как списки строк <path .../>."""
    doc = pymupdf.open(str(SRC))
    svg = doc[0].get_svg_image(text_as_path=True)
    root = ET.fromstring(svg)
    group = next(g for g in root.iter(NS + "g") if g.attrib.get("clip-path") == "url(#clip_11)")
    ruh, word = [], []
    for p in group:
        t = p.attrib.get("transform", "")
        m = re.match(r"matrix\(1,0,0,-1,([-\d.]+),([-\d.]+)\)", t)
        ty = float(m.group(2)) if m else 0.0
        stroke = p.attrib.get("stroke")
        attrs = [f'transform="{t}"', f'd="{p.attrib["d"]}"']
        if stroke:
            attrs.insert(0, 'fill="none"')
            attrs.append('stroke="currentColor"')
            attrs.append(f'stroke-width="{p.attrib.get("stroke-width", "1")}"')
        el = "<path " + " ".join(attrs) + "/>"
        (word if ty >= 1270 else ruh).append(el)
    return ruh, word


def poly(pid, pts, kind):
    d = "M" + " L".join(f"{x:.3f} {y:.3f}" for x, y in pts) + "Z"
    return f'<path d="{d}" fill="url(#g{kind})"/>'


def measure(svg_text, wide):
    """Рендерит SVG на широком холсте и возвращает точные границы содержимого (в единицах viewBox)."""
    import numpy as np

    x, y, w, h = wide
    scale = 2.0
    svg = re.sub(
        r'viewBox="[^"]+"',
        f'viewBox="{x} {y} {w} {h}" width="{w * scale}" height="{h * scale}"',
        svg_text,
        count=1,
    )
    doc = pymupdf.open(stream=svg.encode("utf-8"), filetype="svg")
    pm = doc[0].get_pixmap(alpha=True)
    arr = np.frombuffer(pm.samples, dtype=np.uint8).reshape(pm.height, pm.width, pm.n)
    ys, xs = np.where(arr[..., 3] > 6)
    sx, sy = w / pm.width, h / pm.height
    return (x + xs.min() * sx, y + ys.min() * sy, (xs.max() - xs.min() + 1) * sx, (ys.max() - ys.min() + 1) * sy)


def build(ruh, word, *, wordmark: bool, dark: bool):
    facets = "\n  ".join(poly(*f) for f in FACETS)
    ruh_g = '<g fill="#0A0A0A" color="#0A0A0A">' + "".join(ruh) + "</g>"
    if wordmark:
        c = "#FFFFFF" if dark else "#0A0A0A"
        word_g = f'<g fill="{c}" color="{c}">' + "".join(word) + "</g>"
    else:
        word_g = ""

    def render(vb):
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="RUH Construction">\n'
            f"<defs>{GRADIENTS}</defs>\n  {facets}\n  {ruh_g}\n  {word_g}\n</svg>\n"
        )

    # шаг 1: широкий холст и замер; шаг 2: точный viewBox с минимальным полем
    wide = (500.0, 450.0, 1100.0, 1000.0)
    bx, by, bw, bh = measure(render("500 450 1100 1000"), wide)
    pad = 2.0
    return render(f"{bx - pad:.2f} {by - pad:.2f} {bw + 2 * pad:.2f} {bh + 2 * pad:.2f}")


def build_horizontal(ruh, word, *, dark: bool):
    """Горизонтальный лого: знак слева, надпись CONSTRUCTION справа (для шапки)."""
    nl = chr(10)
    facets = (nl + "  ").join(poly(*f) for f in FACETS)
    ruh_g = '<g fill="#0A0A0A" color="#0A0A0A">' + "".join(ruh) + "</g>"
    c = "#FFFFFF" if dark else "#0A0A0A"
    word_inner = "".join(word)

    def doc(vb, body):
        head = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="RUH Construction">'
        return head + nl + f"<defs>{GRADIENTS}</defs>" + nl + body + nl + "</svg>" + nl

    wide = (300.0, 300.0, 4200.0, 1300.0)
    wide_vb = "300 300 4200 1300"
    ex, ey, ew, eh = measure(doc(wide_vb, facets + nl + "  " + ruh_g), wide)
    wx, wy, ww, wh = measure(doc(wide_vb, f'<g fill="{c}" color="{c}">{word_inner}</g>'), wide)

    # надпись: высота около 24% высоты знака, по центру знака; зазор около 10% высоты знака
    s = 0.24 * eh / wh
    gap = 0.1 * eh
    tx = ex + ew + gap - wx * s
    ty = ey + eh / 2 - (wy + wh / 2) * s
    word_g = f'<g transform="translate({tx:.3f} {ty:.3f}) scale({s:.5f})" fill="{c}" color="{c}">{word_inner}</g>'
    body = "  " + facets + nl + "  " + ruh_g + nl + "  " + word_g
    # измеряем итог и ставим точный viewBox
    bx, by, bw, bh = measure(doc(wide_vb, body), wide)
    pad = 2.0
    return doc(f"{bx - pad:.2f} {by - pad:.2f} {bw + 2 * pad:.2f} {bh + 2 * pad:.2f}", body)




def main():
    ruh, word = extract_lettering()
    (OUT / "emblem.svg").write_text(build(ruh, word, wordmark=False, dark=False), encoding="utf-8")
    (OUT / "logo-light.svg").write_text(build(ruh, word, wordmark=True, dark=False), encoding="utf-8")
    (OUT / "logo-dark.svg").write_text(build(ruh, word, wordmark=True, dark=True), encoding="utf-8")
    (OUT / "logo-h-light.svg").write_text(build_horizontal(ruh, word, dark=False), encoding="utf-8")
    (OUT / "logo-h-dark.svg").write_text(build_horizontal(ruh, word, dark=True), encoding="utf-8")
    print("ok:", [p.name for p in sorted(OUT.glob("*.svg"))])


if __name__ == "__main__":
    sys.exit(main())
