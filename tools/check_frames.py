#!/usr/bin/env python3
from PIL import Image
import os, zipfile

# 1) old vs new detail 帧
for tag, p in [
    ("old detail_0", "/data/data/com.termux/files/home/pt_art_old/sim-preview/frames/periodic-table__detail_0.jpg"),
    ("old detail_1", "/data/data/com.termux/files/home/pt_art_old/sim-preview/frames/periodic-table__detail_1.jpg"),
    ("new detail_0", "/data/data/com.termux/files/home/pt_art_sim/sim-preview/frames/periodic-table__detail_0.jpg"),
]:
    if not os.path.exists(p):
        print(tag, "missing"); continue
    im = Image.open(p).convert("RGB"); w, h = im.size; px = im.load()
    nb = sum(1 for y in range(0, h, 3) for x in range(0, w, 3) if sum(px[x, y]) > 60)
    tot = len(range(0, h, 3)) * len(range(0, w, 3))
    print(f"{tag}: {w}x{h} nonblack={nb/tot:.1%} filesize={os.path.getsize(p)}")

# 2) index 帧列数断言：数第一行水平方向有多少段"格子背景色"
def row_colors(path, row_frac=0.30):
    im = Image.open(path).convert("RGB"); w, h = im.size
    y = int(h * row_frac)
    px = im.load()
    segs = []
    cur = None
    for x in range(w):
        r, g, b = px[x, y]
        bright = (r + g + b) / 3
        key = "black" if bright < 40 else "color"
        if key != cur:
            segs.append([key, x, x])
            cur = key
        else:
            segs[-1][2] = x
    # 非黑段 = 格子
    colored = [s for s in segs if s[0] == "color"]
    widths = [s[2] - s[1] + 1 for s in colored]
    return colored, widths

import glob
idx_dir = "/data/data/com.termux/files/home/pt_art_sim/sim-preview/frames"
for f in sorted(glob.glob(idx_dir + "/periodic-table__index_*.jpg")):
    colored, widths = row_colors(f)
    # 过滤太窄的段（文字/图标碎片 < 8px）
    cells = [w for w in widths if w >= 8]
    print(os.path.basename(f), "格子段数=", len(cells), "宽度=", cells[:8])

# 3) hap 内图标结构
z = zipfile.ZipFile("/data/data/com.termux/files/home/pt_art/periodic-table-16/periodic-table.hap")
names = [n for n in z.namelist() if "icon" in n.lower() or ".png" in n.lower()]
print("hap 内 png 条目:", names[:10])
if names:
    b = z.read(names[0])
    print("size:", len(b))
