#!/usr/bin/env python3
"""Generate the single fixed-scale periodic-table atlas used by Lite Wearable.

The phone renders this PNG through the native <image> component. Text is baked
at build/source time because FIT3 Canvas fillText is not reliable on device.
Validation metadata stays in tools/, outside the watch payload. --manifest-only
refreshes it from the existing PNG without redrawing or modifying that PNG.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import io
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "entry/src/main/js/MainAbility"
GRID_JS = MAIN / "common/grid.js"
MODEL_JS = MAIN / "common/model.js"
FONT = ROOT / "tools/NotoSansCJKsc-Regular.otf"
ATLAS_SOURCE = "entry/src/main/js/MainAbility/common/periodic_table_atlas.png"
OUTPUT = ROOT / ATLAS_SOURCE
MANIFEST = ROOT / "tools/atlas_manifest.json"
TILE_W = 64
TILE_H = 72
COLS = 18
ROWS = 9
BG = "#0d1017"


def js_string(source: str, name: str) -> str:
    match = re.search(r"var " + re.escape(name) + r"=(\"(?:\\.|[^\"\\])*\")", source)
    if not match:
        raise RuntimeError("missing JS string: " + name)
    return json.loads(match.group(1))


def load_data() -> tuple[list[list[int]], list[str], list[str], str, str, dict[str, str]]:
    grid_source = GRID_JS.read_text(encoding="utf-8")
    model_source = MODEL_JS.read_text(encoding="utf-8")
    grid_match = re.search(r"var GRID = (\[[\s\S]*?\]);", model_source)
    colors_match = re.search(r"var COLORS=(\{[^;]+\});", grid_source)
    if not grid_match or not colors_match:
        raise RuntimeError("cannot parse compact grid sources")
    matrix = ast.literal_eval(grid_match.group(1))
    symbols = js_string(grid_source, "SYMBOLS").split("|")
    names = js_string(grid_source, "NAMES").split("|")
    categories = js_string(grid_source, "CATEGORIES")
    core = js_string(grid_source, "CORE")
    colors = json.loads(colors_match.group(1))
    if len(matrix) != ROWS or any(len(row) != COLS for row in matrix):
        raise RuntimeError("grid must be 18x9")
    if len(symbols) != 119 or len(names) != 119:
        raise RuntimeError("labels must contain Z=1..118")
    seen = {z for row in matrix for z in row if z > 0}
    if seen != set(range(1, 119)):
        raise RuntimeError("grid does not contain exactly 118 elements")
    return matrix, symbols, names, categories, core, colors


def fit_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), size=size)


def glyph_present(font: ImageFont.FreeTypeFont, text: str) -> bool:
    if not text:
        return False
    mask = font.getmask(text)
    return mask.getbbox() is not None


def write_manifest(source_path: Path = OUTPUT, manifest_path: Path = MANIFEST) -> None:
    """Record the exact source PNG and expected row-major BGRA pixel stream."""
    png = source_path.read_bytes()
    with Image.open(io.BytesIO(png)) as image:
        if image.format != "PNG" or image.size != (1152, 648):
            raise RuntimeError("unexpected atlas size or format")
        pixels = image.convert("RGBA").tobytes("raw", "BGRA")
        metadata = {
            "schema_version": 1,
            "source": ATLAS_SOURCE,
            "width": image.width,
            "height": image.height,
            "pixel_format": "BGRA8888",
            "source_png_sha256": hashlib.sha256(png).hexdigest(),
            "pixels_bgra_sha256": hashlib.sha256(pixels).hexdigest(),
        }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def generate() -> None:
    matrix, symbols, names, categories, core, colors = load_data()
    image = Image.new("RGB", (COLS * TILE_W, ROWS * TILE_H), BG)
    draw = ImageDraw.Draw(image)
    number_font = fit_font(10)
    symbol_font = fit_font(27)
    name_font = fit_font(13)
    placeholder_symbol_font = fit_font(12)
    placeholder_name_font = fit_font(12)

    for row_index, row in enumerate(matrix):
        for col_index, z in enumerate(row):
            if not z:
                continue
            x = col_index * TILE_W
            y = row_index * TILE_H
            gap = 2
            if z == -1:
                color, symbol, name = colors["l"], "57-71", "镧系"
            elif z == -2:
                color, symbol, name = colors["c"], "89-103", "锕系"
            else:
                color = colors[categories[z]]
                symbol, name = symbols[z], names[z]
            draw.rounded_rectangle(
                (x + gap, y + gap, x + TILE_W - gap - 1, y + TILE_H - gap - 1),
                radius=3,
                fill=color,
            )
            if z > 0:
                draw.text((x + TILE_W - 5, y + 5), str(z), font=number_font,
                          fill="#becbd8", anchor="ra")
                if core[z] == "1":
                    draw.rectangle((x + 6, y + 7, x + 10, y + 11), fill="#f6c879")
                if not glyph_present(symbol_font, symbol) or not glyph_present(name_font, name):
                    raise RuntimeError("font cannot render Z=%d %s %s" % (z, symbol, name))
                draw.text((x + TILE_W / 2, y + 35), symbol, font=symbol_font,
                          fill="#f0f3f8", anchor="mm")
                draw.text((x + TILE_W / 2, y + 59), name, font=name_font,
                          fill="#f0f3f8", anchor="mm")
            else:
                draw.text((x + TILE_W / 2, y + 31), symbol,
                          font=placeholder_symbol_font, fill="#f0f3f8", anchor="mm")
                draw.text((x + TILE_W / 2, y + 52), name,
                          font=placeholder_name_font, fill="#f0f3f8", anchor="mm")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT, format="PNG", optimize=True)
    write_manifest(OUTPUT, MANIFEST)
    print(str(OUTPUT))
    print("size=%dx%d bytes=%d" % (image.width, image.height, OUTPUT.stat().st_size))
    print("manifest=" + str(MANIFEST))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest-only", action="store_true",
                        help="generate tools/atlas_manifest.json without changing the source PNG")
    if parser.parse_args().manifest_only:
        write_manifest()
        print(str(MANIFEST))
    else:
        generate()
