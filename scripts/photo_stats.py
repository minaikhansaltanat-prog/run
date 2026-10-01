#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Статистика цвета фото для калибровки единого пресета (ТЗ 8.2).

  python scripts/photo_stats.py <папка_или_файлы...> [--json out.json]

Считает по каждому фото: средняя яркость L*, перцентили p5/p95 по L* (контраст),
средняя насыщенность (хрома Lab), средние a*/b* (теплота), оценка цветовой температуры (CCT по McCamy).
Работает на уменьшенной копии (длинная сторона 800 px): для статистики этого достаточно.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

D65 = np.array([0.95047, 1.0, 1.08883])
M = np.array([[0.4124564, 0.3575761, 0.1804375],
              [0.2126729, 0.7151522, 0.0721750],
              [0.0193339, 0.1191920, 0.9503041]])


def srgb_to_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_lab(rgb):
    lin = srgb_to_linear(rgb.astype(np.float64))
    xyz = lin @ M.T / D65
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return L, a, b, lin


def cct_mccamy(lin_mean):
    xyz = M @ lin_mean
    s = xyz.sum()
    if s <= 0:
        return None
    x, y = xyz[0] / s, xyz[1] / s
    n = (x - 0.3320) / (0.1858 - y)
    return float(449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33)


def stats(path: Path):
    im = Image.open(path).convert("RGB")
    im.thumbnail((800, 800))
    rgb = np.asarray(im)
    L, a, b, lin = to_lab(rgb)
    chroma = np.sqrt(a ** 2 + b ** 2)
    return {
        "file": path.name,
        "L_mean": float(L.mean()),
        "L_std": float(L.std()),
        "L_p5": float(np.percentile(L, 5)),
        "L_p95": float(np.percentile(L, 95)),
        "a_mean": float(a.mean()),
        "b_mean": float(b.mean()),
        "a_std": float(a.std()),
        "b_std": float(b.std()),
        "chroma_mean": float(chroma.mean()),
        "cct_k": cct_mccamy(lin.reshape(-1, 3).mean(axis=0)),
        "clip_hi_pct": float((rgb.max(axis=2) >= 253).mean() * 100),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="+")
    ap.add_argument("--json")
    args = ap.parse_args()
    files = []
    for i in args.inputs:
        p = Path(i)
        files += sorted(p.glob("*.jp*g")) + sorted(p.glob("*.png")) if p.is_dir() else [p]
    rows = [stats(f) for f in files]
    keys = ["L_mean", "L_p5", "L_p95", "a_mean", "b_mean", "chroma_mean", "cct_k", "clip_hi_pct"]
    for r in rows:
        print(f"{r['file']:28s} " + " ".join(f"{k}={r[k]:.1f}" for k in keys if r[k] is not None))
    mean = {k: float(np.mean([r[k] for r in rows if r[k] is not None])) for k in keys}
    mean.update({k: float(np.mean([r[k] for r in rows])) for k in ("L_std", "a_std", "b_std")})
    print("MEAN:", {k: round(v, 2) for k, v in mean.items()})
    if args.json:
        Path(args.json).write_text(json.dumps({"mean": mean, "items": rows}, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
