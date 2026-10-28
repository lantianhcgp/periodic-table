#!/usr/bin/env python3
"""重建 index.js：git HEAD 的 ELEM+PAL（第3-4行）+ 新逻辑 tail"""
import subprocess, os, sys

base = os.path.expanduser("~/periodic-table")
ipath = f"{base}/entry/src/main/js/MainAbility/pages/index/index.js"

rel = "entry/src/main/js/MainAbility/pages/index/index.js"
src = subprocess.run(["git", "show", f"HEAD:{rel}"], cwd=base,
                     capture_output=True, text=True, check=True).stdout
lines = src.split("\n")
# var ELEM = index 3, var PAL = index 4（HEAD 前 3 行是注释）
ELEM_PAL = lines[3] + "\n" + lines[4] + "\n"
assert lines[3].startswith("var ELEM") and lines[4].startswith("var PAL"), "line offset wrong"

tail = '''// index page — 高考版周期表：表冠纵向滚 + 横向 touch 滑动换列 + 100% 自适应缩放
// 自适应（不写死分辨率）：列宽/字号/表高全部由 @system.device 实测窗口宽算，JS 内联 px；
// 根容器 100%×100%（lite 唯一合法的百分比用法），内部格不用百分比、按窗口 94% 宽均分 cols 列。
// 缩放只作用元素格（改 cols→cw/ch/fs）；标题/底部工具条固定尺寸，不随缩放缩放。
// 横向换列 = 手指左右滑动（ontouchstart/move/end），删除 ◀▶ 控件；纵向 = 表冠滚 <list>。
var COLS = [5, 4, 3];  // 1x/2x/3x 每屏列数（放大=列少=渲染节点少=省堆）
var L = { "title": "元素周期表", "badge": "高考版 · 35 核心", "hint": "左右滑动换列 · 点元素看详情" };
var PAGE = '#0d0d16', PHDIM = '#4a4a5a';
function rowOf(r, start, cols, fs, fsph) {
  var out = [];
  for (var c = start; c < start + cols; c++) {
    var hit = null;
    for (var k = 0; k < ELEM.length; k++) { var e = ELEM[k]; if (e[4] === r && e[5] === c + 1) { hit = e; break; } }
    if (hit) { out.push({ z: hit[0], sym: hit[1], bg: PAL[hit[2]][hit[3] ? 2 : 0], color: PAL[hit[2]][hit[3] ? 3 : 1], fs: fs }); }
    else if (r === 5 && c === 2) { out.push({ z: 0, sym: '57~71', bg: PAGE, color: PHDIM, fs: fsph }); }
    else if (r === 6 && c === 2) { out.push({ z: 0, sym: '89~103', bg: PAGE, color: PHDIM, fs: fsph }); }
    else { out.push({ z: 0, sym: '', bg: PAGE, color: 'transparent', fs: 0 }); }
  }
  return out;
}
// touch 坐标（API10 裸名 ontouchstart/ontouchmove/ontouchend；多来源取值防 undefined）
function tev(e) {
  if (!e) { return null; }
  if (typeof e.x === 'number') { return { x: e.x, y: e.y }; }
  if (typeof e.clientX === 'number') { return { x: e.clientX, y: e.clientY }; }
  if (e.touches && e.touches[0]) { return { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  return null;
}
export default {
  data: {
    title: L.title, badge: L.badge, hint: L.hint,
    zoom: 0, start: 0, cols: 5,
    cw: 74, ch: 49, fs: 31, fsph: 9, listW: 370, listH: 300,
    zoomLabel: '1×', canPrev: 0, canNext: 1,
    r0: [], r1: [], r2: [], r3: [], r4: [], r5: [], r6: [], r7: [], r8: []
  },
  // 表冠：授予/撤销 <list> 焦点 → 表冠原生驱动纵向滚（多段补焦防 data 落地冲掉焦点）
  onShow: function () {
    var that = this;
    this.grantCrown(true);
    setTimeout(function () { that.grantCrown(true); }, 50);
    setTimeout(function () { that.grantCrown(true); }, 400);
    this.measure();
  },
  onHide: function () { this.grantCrown(false); },
  onDestroy: function () { this.grantCrown(false); },
  grantCrown: function (v) {
    var l = this.$refs && this.$refs.tableList;
    if (l && l.rotation) { l.rotation({ focus: v }); }
  },
  // 拉窗口实测尺寸（100% 自适应：列宽/字号/表高随设备实测算，不同分辨率不写死 px）
  measure: function () {
    var that = this;
    try {
      require('@system.device').getInfo({
        success: function (d) {
          if (d && d.windowWidth) { that.W = d.windowWidth; that.H = d.windowHeight || that.H; }
          that.layout();
          that.grantCrown(true);
          setTimeout(function () { that.grantCrown(true); }, 50);
        }
      });
    } catch (e) { }
  },
  // 按当前 zoom 列数 × 窗口宽 重算每格尺寸并重建 9 行（缩放只动格，header/工具条不动）
  layout: function () {
    var W = this.W || 396, H = this.H || 480, cols = COLS[this.zoom];
    var listW = Math.floor(W * 0.94);
    var cw = Math.floor(listW / cols);
    var ch = Math.max(20, Math.round(cw * 0.66));
    var fs = Math.max(9, Math.round(cw * 0.42));
    this.cols = cols; this.cw = cw; this.ch = ch; this.fs = fs;
    this.fsph = Math.max(6, fs - 4); this.listW = listW;
    this.listH = Math.min(ch * 9 + 30, Math.floor(H * 0.64));
    this.rebuild();
  },
  rebuild: function () {
    var cols = this.cols, i = this.start, mx = 18 - cols;
    if (i > mx) { i = mx; } if (i < 0) { i = 0; }
    this.start = i;
    this.r0 = rowOf(0, i, cols, this.fs, this.fsph);
    this.r1 = rowOf(1, i, cols, this.fs, this.fsph);
    this.r2 = rowOf(2, i, cols, this.fs, this.fsph);
    this.r3 = rowOf(3, i, cols, this.fs, this.fsph);
    this.r4 = rowOf(4, i, cols, this.fs, this.fsph);
    this.r5 = rowOf(5, i, cols, this.fs, this.fsph);
    this.r6 = rowOf(6, i, cols, this.fs, this.fsph);
    this.r7 = rowOf(7, i, cols, this.fs, this.fsph);
    this.r8 = rowOf(8, i, cols, this.fs, this.fsph);
    this.zoomLabel = (this.zoom + 1) + '×';
    this.canPrev = i > 0 ? 1 : 0;
    this.canNext = i < mx ? 1 : 0;
  },
  // 缩放：只改 cols→cw/ch/fs（元素格放大），标题/工具条尺寸固定不随缩放
  zoomIn: function () { if (this.zoom < 2) { this.zoom++; this.start = Math.min(this.start, 18 - COLS[this.zoom]); this.layout(); } },
  zoomOut: function () { if (this.zoom > 0) { this.zoom--; this.start = Math.min(this.start, 18 - COLS[this.zoom]); this.layout(); } },
  // 横向手指滑动换列（替代 ◀▶）：横向位移超阈值翻页；纵向滚动交给表冠/list
  onTouchStart: function (e) { var c = tev(e); this._tx = c ? c.x : 0; this._sw = 0; },
  onTouchMove: function (e) { var c = tev(e); if (c && this._tx != null) { this._sw = c.x - this._tx; } },
  onTouchEnd: function () {
    var s = this._sw; this._sw = 0;
    var th = 40;
    if (s > th) { this.start = Math.max(0, this.start - 1); this.rebuild(); }
    else if (s < -th) { this.start = Math.min(18 - this.cols, this.start + 1); this.rebuild(); }
  },
  onOpenElement: function (z) {
    if (!z) { return; }
    var s = require('@system.storage');
    var r = require('@system.router');
    var jump = function () { if (r.replaceUrl) { r.replaceUrl({ uri: 'pages/detail/detail' }); } else { r.replace({ uri: 'pages/detail/detail' }); } };
    s.set({ key: 'pt_z', value: String(z), success: jump, fail: jump });
  }
};
'''
open(ipath, "w").write(ELEM_PAL + tail)
r = subprocess.run(["node", "--check", ipath], capture_output=True, text=True)
print("node --check:", r.returncode, r.stderr[:300])
print("new size:", os.path.getsize(ipath))
# 确认 ELEM 数据行数
print("ELEM 行数(118? 实际):", ELEM_PAL.count("])") and len(ELEM_PAL.split("\n")))
