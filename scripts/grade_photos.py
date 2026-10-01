#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Единая цветокоррекция фото RUH (ТЗ раздел 8). Этап 1 из 2: тон и цвет.
Этап 2 (ресайз, резкость, AVIF/WebP/JPEG, контактный лист) делает scripts/enhance-photos.mjs.

Вход:  assets/raw/<id>.jpg  (оригиналы не меняются)
       .cache/esrgan/<id>.png  (апскейл Real-ESRGAN, если был нужен)
       config/photo-preset.json, config/photos.json (индивидуальные правки: rotate, strength, skip)
Выход: .cache/graded/<id>.png  (рабочий мастер до 2560 px по длинной стороне)
       docs/photo-qa/stats.json (статистика до/после)

Что делаем (разрешено ТЗ 8.5): баланс белого по нейтральным пикселям, экспозиция, мягкое восстановление
пересветов, S-кривая, vibrance, снятие желто-зеленого налета, перенос теплоты. Планировку, мебель и
отделку не меняем, ничего не дорисовываем.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets" / "raw"
ESR = ROOT / ".cache" / "esrgan"
OUT = ROOT / ".cache" / "graded"
QA = ROOT / "docs" / "photo-qa"

D65 = np.array([0.95047, 1.0, 1.08883])
M = np.array([[0.4124564, 0.3575761, 0.1804375],
              [0.2126729, 0.7151522, 0.0721750],
              [0.0193339, 0.1191920, 0.9503041]])
Minv = np.linalg.inv(M)


def s2l(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def l2s(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def rgb_to_lab(rgb):  # rgb float 0..1
    xyz = s2l(rgb) @ M.T / D65
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return 116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])


def lab_to_rgb(L, a, b):
    fy = (L + 16) / 116
    fx, fz = fy + a / 500, fy - b / 200

    def finv(t):
        return np.where(t ** 3 > 216 / 24389, t ** 3, (116 * t - 16) / (24389 / 27))

    xyz = np.stack([finv(fx), finv(fy), finv(fz)], axis=-1) * D65
    return l2s(xyz @ Minv.T)


def cct_mccamy(rgb):
    lin = s2l(rgb).reshape(-1, 3).mean(axis=0)
    xyz = M @ lin
    x, y = xyz[0] / xyz.sum(), xyz[1] / xyz.sum()
    n = (x - 0.3320) / (0.1858 - y)
    return float(449 * n ** 3 + 3525 * n ** 2 + 6823.3 * n + 5520.33)


def measure(rgb):
    L, a, b = rgb_to_lab(rgb)
    c = np.hypot(a, b)
    return {
        "L_mean": float(L.mean()), "L_p5": float(np.percentile(L, 5)), "L_p95": float(np.percentile(L, 95)),
        "chroma_mean": float(c.mean()), "a_mean": float(a.mean()), "b_mean": float(b.mean()),
        "cct_k": cct_mccamy(rgb), "clip_hi_pct": float((rgb.max(axis=2) >= 0.992).mean() * 100),
    }


def smoothstep(x):
    return x * x * (3 - 2 * x)


def grade(rgb, p, strength):
    """rgb float32 (H,W,3) 0..1 -> graded float32"""
    g = p["grade"]
    L, a, b = rgb_to_lab(rgb)

    # 1. баланс белого по нейтральным пикселям (стены, потолок, белая мебель): сдвиг в a/b с ограничением
    chroma = np.hypot(a, b)
    mask = (chroma < g["neutralChromaMax"]) & (L > 25) & (L < 92)
    if mask.mean() > 0.02:
        da = np.clip(g["neutralTarget"]["a"] - a[mask].mean(), -g["whiteBalanceMaxShift"]["a"], g["whiteBalanceMaxShift"]["a"])
        db = np.clip(g["neutralTarget"]["b"] - b[mask].mean(), -g["whiteBalanceMaxShift"]["b"], g["whiteBalanceMaxShift"]["b"])
        wmid = smoothstep(np.clip((L - 6) / 16, 0, 1)) * (1 - smoothstep(np.clip((L - 84) / 12, 0, 1)))
        a = a + da * strength / 0.6 * wmid
        b = b + db * strength / 0.6 * wmid

    # 2. экспозиция: нормализация средней яркости к 55-59, мягко, по средним тонам
    shift = np.clip(g["targetMeanL"] - L.mean(), -g["exposureMaxShift"], g["exposureMaxShift"]) * strength / 0.6
    L = L + shift * np.sin(np.pi * np.clip(L, 0, 100) / 100)

    # 3. мягкое восстановление пересветов (окна, лампы)
    knee = g["highlightKnee"]
    L = np.where(L > knee, knee + (L - knee) * g["highlightRolloff"], L)

    # 4. черная точка (богатые тени) и S-кривая
    bp = np.percentile(L, g["blackPointPercentile"]) * g["blackPointStrength"] * strength / 0.6
    L = np.clip((L - bp) / (100 - bp) * 100, 0, 100)
    x = L / 100.0
    L = 100 * (x + g["contrast"] * strength / 0.6 * (smoothstep(x) - x))

    # 5. цвет: vibrance + saturation, снять желто-зеленый налет ламп
    chroma = np.hypot(a, b)
    hue = np.degrees(np.arctan2(b, a)) % 360
    vib = g["vibrance"] * (1 - np.clip(chroma / 35.0, 0, 1))
    gain = 1 + (vib + g["saturation"]) * strength / 0.6
    yg = np.exp(-((hue - 100.0) ** 2) / (2 * 14.0 ** 2))  # окно вокруг желто-зеленого
    gain = gain * (1 - g["yellowGreenReduction"] * yg * np.clip(chroma / 20.0, 0, 1))
    a, b = a * gain, b * gain

    # 6. теплота ближе к эталону (ограниченно)
    ref = p["reference"]
    wb = np.clip((ref["b_mean"] - b.mean()) * g["warmthTowardReference"] * strength, -g["warmthMaxShift"], g["warmthMaxShift"])
    wmid2 = smoothstep(np.clip((L - 6) / 16, 0, 1)) * (1 - smoothstep(np.clip((L - 84) / 12, 0, 1)))
    b = b + wb * wmid2

    # 7. светлые зоны (окна, лампы) не красим: мягко гасим цвет у белой точки
    hl = smoothstep(np.clip((L - 86) / 12, 0, 1))
    a, b = a * (1 - 0.7 * hl), b * (1 - 0.7 * hl)

    return lab_to_rgb(L, a, b).astype(np.float32)


def load_working(pid, p, cfg):
    """Рабочая копия: Real-ESRGAN (если есть) в смеси с Lanczos оригинала, до workingLongSidePx."""
    src = Image.open(RAW / f"{pid}.jpg")
    src = src.convert("RGB")
    w0, h0 = src.size
    target_long = p["upscale"]["workingLongSidePx"]
    esr = ESR / f"{pid}.png"
    flags = []
    if esr.exists():
        up = Image.open(esr).convert("RGB")
        scale = min(1.0, target_long / max(up.size))
        size = (round(up.width * scale), round(up.height * scale))
        up = up.resize(size, Image.LANCZOS)
        lanc = src.resize(size, Image.LANCZOS)
        w = p["upscale"]["esrganWeight"]
        arr = w * np.asarray(up, dtype=np.float32) + (1 - w) * np.asarray(lanc, dtype=np.float32)
        flags.append("esrgan")
        out = arr / 255.0
    else:
        long0 = max(w0, h0)
        scale = min(1.0, target_long / long0)
        size = (round(w0 * scale), round(h0 * scale))
        out = np.asarray(src.resize(size, Image.LANCZOS), dtype=np.float32) / 255.0
        flags.append("lanczos" if long0 < 2000 else "native")
    rot = cfg.get("rotate", 0)
    if rot:
        im = Image.fromarray((out * 255).astype(np.uint8)).rotate(rot, resample=Image.BICUBIC, expand=False)
        out = np.asarray(im, dtype=np.float32) / 255.0
        flags.append(f"rotate:{rot}")
    return out, (w0, h0), flags


def main():
    preset = json.loads((ROOT / "config" / "photo-preset.json").read_text(encoding="utf-8"))
    photos_cfg_path = ROOT / "config" / "photos.json"
    photos_cfg = json.loads(photos_cfg_path.read_text(encoding="utf-8")) if photos_cfg_path.exists() else {}
    only = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    report = {}
    qa_path = QA / "stats.json"
    if qa_path.exists():
        report = json.loads(qa_path.read_text(encoding="utf-8"))

    for f in sorted(RAW.glob("*.jpg")):
        pid = f.stem
        if only and pid not in only:
            continue
        cfg = photos_cfg.get(pid, {})
        if cfg.get("skip"):
            print(f"[skip] {pid} (config)")
            continue
        strength = cfg.get("strength", preset["grade"]["strength"])
        arr, orig_size, flags = load_working(pid, preset, cfg)
        before = measure(arr)
        out = grade(arr, preset, strength)
        after = measure(out)
        Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8)).save(OUT / f"{pid}.png", compress_level=3)
        report[pid] = {"original": {"w": orig_size[0], "h": orig_size[1]}, "master": {"w": arr.shape[1], "h": arr.shape[0]},
                       "flags": flags, "strength": strength, "before": before, "after": after}
        print(f"[ok] {pid} {orig_size[0]}x{orig_size[1]} -> {arr.shape[1]}x{arr.shape[0]} {flags} "
              f"L {before['L_mean']:.1f}->{after['L_mean']:.1f}  p5 {before['L_p5']:.0f}->{after['L_p5']:.0f}  "
              f"C {before['chroma_mean']:.1f}->{after['chroma_mean']:.1f}  b* {before['b_mean']:.1f}->{after['b_mean']:.1f}  "
              f"CCT {before['cct_k']:.0f}->{after['cct_k']:.0f}  clip {before['clip_hi_pct']:.1f}->{after['clip_hi_pct']:.1f}%")
    qa_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
