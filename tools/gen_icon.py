#!/usr/bin/env python3
# 周期表主题图标：深色底 + 3x3 分类配色小方格（L 形观感，右下角空）+ 白色元素符号
# 几何自适应：tile/gap/margin 由 size 推导，保证 3 列 3 行始终放得下，不溢出裁切
# 输出 114x114 与 80x80，flat 少色 + zlib level9 → 压缩 <5KB
import os, zlib, struct

MEDIA = "entry/src/main/resources/base/media"
COL = {"nm": "#ffd43b", "alk": "#ff6b6b", "met": "#69db7c",
       "tr": "#5c7cfa", "post": "#4dabf7", "hal": "#f783ac"}
BG = (13, 13, 22)
WHITE = (240, 242, 250)

def hx(h):
    h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# 5x7 点阵（H Li Na O C Fe Au Cl）
FONT = {
 "H": ["XXXX","X..X","X..X","X..X","XXXX","X..X","X..X"],
 "L": ["XXXX","X..X","X..X","X..X","X..X","X..X","XXXX"],
 "i": [".X..","XX..",".X..",".X..",".X..",".X..","XXXX"],
 "N": ["X..X","XX.X","X.XX","X..X","X..X","X..X","X..X"],
 "a": ["....","XXXX","X..X","XXXX","X.XX","X..X","XXXX"],
 "O": ["XXXX","X..X","X..X","X..X","X..X","X..X","XXXX"],
 "C": ["XXXX","X..X","X...","X..X","X..X","X..X","XXXX"],
 "F": ["XXXX","X..X","X..X","XXXX","X..X","X..X","X..X"],
 "e": ["....","XXXX","X..X","XXXX","X..X","X..X","XXXX"],
 "A": ["X..X","XX.X","X.XX","XXXX","X..X","X..X","X..X"],
 "u": ["X..X","X..X","X..X","X.XX","X..X","X..X","XXXX"],
}

def make(size):
    w = size
    px = [list(BG)] * (w * w)
    def put(x, y, c):
        if 0 <= x < w and 0 <= y < w: px[y * w + x] = list(c)
    def cell(gx, gy, rgb):
        # 自适应几何：预留外框 1px，3x3 均分
        ring = max(2, int(w * 0.035))          # 外框内缩
        m = ring + max(1, int(w * 0.03))        # 网格边距
        tile = int((w - 2 * m) * 0.28)
        gap = int((w - 2 * m - 3 * tile) / 2)
        x0 = m + gx * (tile + gap); y0 = m + gy * (tile + gap)
        r = max(2, int(tile * 0.22))
        for y in range(y0, y0 + tile):
            for x in range(x0, x0 + tile):
                cx = x0 + r if x < x0 + r else (x0 + tile - 1 - r if x > x0 + tile - 1 - r else x)
                cy = y0 + r if y < y0 + r else (y0 + tile - 1 - r if y > y0 + tile - 1 - r else y)
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    put(x, y, rgb)
        return x0, y0, tile
    def glyph(text, cx, cy, s):
        cw = 5 * s + s
        bx = int(cx - len(text) * cw / 2)
        by = int(cy - 3.5 * s)
        for i, ch in enumerate(text):
            g = FONT.get(ch)
            if not g: continue
            for ry, row in enumerate(g):
                for rx, cc in enumerate(row):
                    if cc == "X":
                        for yy in range(by + ry * s, by + (ry + 1) * s):
                            for xx in range(bx + rx * s, bx + (rx + 1) * s):
                                put(xx, yy, WHITE)
    # 外框（圆角描边）
    ring = max(2, int(w * 0.035)); rr = ring * 1.7; bw = w
    for y in range(ring, bw - ring):
        for x in range(ring, bw - ring):
            ring2 = min(x - ring, (bw - ring - 1) - x, y - ring, (bw - ring - 1) - y)
            if ring2 == 0:
                cx = ring + rr if x < ring + rr else ((bw - ring - 1) - rr if x > (bw - ring - 1) - rr else x)
                cy = ring + rr if y < ring + rr else ((bw - ring - 1) - rr if y > (bw - ring - 1) - rr else y)
                if (x - cx) ** 2 + (y - cy) ** 2 <= rr * rr + 1:
                    put(x, y, (70, 74, 96))
    # 8 格（3x3 去掉右下角），右下空白 = 周期表 L 形观感
    cells = [("H","nm",0,0),("Li","alk",0,1),("Na","alk",0,2),
             ("O","met",1,0),("C","nm",1,1),("Fe","tr",1,2),
             ("Au","post",2,1),("Cl","hal",2,2)]
    m = ring + max(1, int(w * 0.03)); tile = int((w - 2*m) * 0.28); gap = int((w - 2*m - 3*tile)/2)
    for (txt, cat, gx, gy) in cells:
        x0, y0, t = cell(gx, gy, hx(COL[cat]))
        s = max(1, int(t * 0.09))
        glyph(txt, x0 + t / 2, y0 + t / 2, s)
    return px

def png(w, h, px):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            r, g, b = px[y * w + x]; raw += bytes([r, g, b, 255])
    def ck(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", ihdr) + ck(b"IDAT", zlib.compress(bytes(raw), 9)) + ck(b"IEND", b"")

def main():
    os.makedirs(MEDIA, exist_ok=True)
    for size, name in [(114, "icon.png"), (80, "icon_small.png")]:
        data = png(size, size, make(size))
        p = os.path.join(MEDIA, name); open(p, "wb").write(data)
        print(f"{name}: {size}x{size} {len(data)}B {'OK' if len(data) <= 5120 else '!!>5KB!!'}")

if __name__ == "__main__":
    main()
