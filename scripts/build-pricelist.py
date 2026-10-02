#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Прайс-лист для просмотра на сайте: PDF -> страницы-картинки с водяным знаком.

  python scripts/build-pricelist.py [путь к PDF]     (по умолчанию assets/pricelist/source.pdf)

Результат:
  public/pricelist/page-N.<хэш>.webp   страницы с диагональным водяным знаком RUH Construction
  content/pricelist.json                список страниц (файл, ширина, высота) и дата прайса

Оригинальный PDF на сайт и в репозиторий НЕ попадает (assets/pricelist и *.pdf в .gitignore):
посетитель видит только картинки страниц, которые рисуются в окне просмотра и не имеют кнопки "Скачать".
Нужны: pip install pymupdf pillow
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets" / "pricelist" / "source.pdf"
OUT = ROOT / "public" / "pricelist"
ZOOM = 2.0  # A4 -> 1191 x 1684 px: читается при увеличении на телефоне, но не годится для печати
WEBP_QUALITY = 82
HEADER_CUT_PT = 105  # высота шапки первой страницы в pt (таблица начинается с ~119 pt)

WATERMARK_TEXT = "RUH Construction"
WATERMARK_ANGLE = 28
WATERMARK_ALPHA = 30  # из 255: заметно на скриншоте, но таблица читается
STEP_X, STEP_Y = 380, 230


def find_font(size):
    candidates = [
        ROOT / ".cache" / "fonts" / "Onest.ttf",
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]
    for c in candidates:
        if c.exists():
            return ImageFont.truetype(str(c), size)
    return ImageFont.load_default()


def watermark_layer(width, height):
    """Прозрачный слой с повторяющейся диагональной надписью"""
    font = find_font(40)
    tile = Image.new("RGBA", (STEP_X * 3, STEP_Y * 3), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    for row in range(-1, 4):
        for col in range(-1, 4):
            x = col * STEP_X + (STEP_X // 2 if row % 2 else 0)
            y = row * STEP_Y
            d.text((x, y), WATERMARK_TEXT, font=font, fill=(15, 15, 17, WATERMARK_ALPHA))
    # поворот всего полотна, затем вырезаем центр нужного размера
    big = max(width, height) * 2
    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    for ox in range(0, big, tile.width):
        for oy in range(0, big, tile.height):
            canvas.alpha_composite(tile, (ox, oy))
    rotated = canvas.rotate(WATERMARK_ANGLE, resample=Image.BICUBIC)
    left = (rotated.width - width) // 2
    top = (rotated.height - height) // 2
    return rotated.crop((left, top, left + width, top + height))


def main():
    if not SRC.exists():
        sys.exit(f"Нет файла {SRC}. Положите PDF прайс-листа в assets/pricelist/source.pdf")
    doc = pymupdf.open(str(SRC))
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("page-*.webp"):
        old.unlink()

    date_iso = None
    pages = []
    layer = None
    for i, page in enumerate(doc):
        if date_iso is None:
            m = re.search(r"(\d{4}-\d{2}-\d{2})", page.get_text())
            if m:
                date_iso = m.group(1)
        if i == 0:
            # убираем шапку первой страницы: "Прайс-лист", дата и строка про сервис 101-app.com (по просьбе клиента)
            page.add_redact_annot(pymupdf.Rect(0, 0, page.rect.width, HEADER_CUT_PT), fill=(1, 1, 1))
            page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
        pix = page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("RGBA")
        if layer is None or layer.size != img.size:
            layer = watermark_layer(img.width, img.height)
        img.alpha_composite(layer)
        rgb = img.convert("RGB")
        tmp = OUT / f"_tmp-{i + 1}.webp"
        rgb.save(tmp, "WEBP", quality=WEBP_QUALITY, method=6)
        digest = hashlib.sha1(tmp.read_bytes()).hexdigest()[:8]
        final = OUT / f"page-{i + 1}.{digest}.webp"
        tmp.replace(final)
        pages.append({"file": f"/pricelist/{final.name}", "width": rgb.width, "height": rgb.height})
        print(f"[ok] страница {i + 1}: {rgb.width}x{rgb.height}, {final.stat().st_size // 1024} КБ")

    data = {
        "note": "Создано scripts/build-pricelist.py. Оригинальный PDF на сайт не публикуется.",
        "updated": date_iso,
        "pages": pages,
    }
    (ROOT / "content" / "pricelist.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Готово: {len(pages)} стр., дата прайса {date_iso}")


if __name__ == "__main__":
    main()
