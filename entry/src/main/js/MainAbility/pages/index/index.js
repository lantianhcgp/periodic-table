var ELEM = [[1, "H", 5, 1, 0, 1], [2, "He", 7, 1, 0, 18], [3, "Li", 0, 1, 1, 1], [4, "Be", 1, 1, 1, 2], [5, "B", 4, 1, 1, 3], [6, "C", 5, 1, 1, 4], [7, "N", 5, 1, 1, 5], [8, "O", 5, 1, 1, 6], [9, "F", 6, 1, 1, 7], [10, "Ne", 7, 1, 1, 8], [11, "Na", 0, 1, 2, 1], [12, "Mg", 1, 1, 2, 2], [13, "Al", 3, 1, 2, 3], [14, "Si", 4, 1, 2, 4], [15, "P", 5, 1, 2, 5], [16, "S", 5, 1, 2, 6], [17, "Cl", 6, 1, 2, 7], [18, "Ar", 7, 1, 2, 8], [19, "K", 0, 1, 3, 1], [20, "Ca", 1, 1, 3, 2], [21, "Sc", 2, 0, 3, 3], [22, "Ti", 2, 0, 3, 4], [23, "V", 2, 0, 3, 5], [24, "Cr", 2, 1, 3, 6], [25, "Mn", 2, 1, 3, 7], [26, "Fe", 2, 1, 3, 8], [27, "Co", 2, 0, 3, 9], [28, "Ni", 2, 0, 3, 10], [29, "Cu", 2, 1, 3, 11], [30, "Zn", 3, 1, 3, 12], [31, "Ga", 3, 0, 3, 13], [32, "Ge", 4, 0, 3, 14], [33, "As", 4, 0, 3, 15], [34, "Se", 5, 0, 3, 16], [35, "Br", 6, 1, 3, 17], [36, "Kr", 7, 0, 3, 18], [37, "Rb", 0, 0, 4, 1], [38, "Sr", 1, 0, 4, 2], [39, "Y", 2, 0, 4, 3], [40, "Zr", 2, 0, 4, 4], [41, "Nb", 2, 0, 4, 5], [42, "Mo", 2, 0, 4, 6], [43, "Tc", 2, 0, 4, 7], [44, "Ru", 2, 0, 4, 8], [45, "Rh", 2, 0, 4, 9], [46, "Pd", 2, 0, 4, 10], [47, "Ag", 2, 1, 4, 11], [48, "Cd", 3, 0, 4, 12], [49, "In", 3, 0, 4, 13], [50, "Sn", 3, 1, 4, 14], [51, "Sb", 4, 0, 4, 15], [52, "Te", 4, 0, 4, 16], [53, "I", 6, 1, 4, 17], [54, "Xe", 7, 0, 4, 18], [55, "Cs", 0, 0, 5, 1], [56, "Ba", 1, 1, 5, 2], [57, "La", 8, 0, 7, 3], [58, "Ce", 8, 0, 7, 4], [59, "Pr", 8, 0, 7, 5], [60, "Nd", 8, 0, 7, 6], [61, "Pm", 8, 0, 7, 7], [62, "Sm", 8, 0, 7, 8], [63, "Eu", 8, 0, 7, 9], [64, "Gd", 8, 0, 7, 10], [65, "Tb", 8, 0, 7, 11], [66, "Dy", 8, 0, 7, 12], [67, "Ho", 8, 0, 7, 13], [68, "Er", 8, 0, 7, 14], [69, "Tm", 8, 0, 7, 15], [70, "Yb", 8, 0, 7, 16], [71, "Lu", 8, 0, 7, 17], [72, "Hf", 2, 0, 5, 4], [73, "Ta", 2, 0, 5, 5], [74, "W", 2, 1, 5, 6], [75, "Re", 2, 0, 5, 7], [76, "Os", 2, 0, 5, 8], [77, "Ir", 2, 0, 5, 9], [78, "Pt", 2, 1, 5, 10], [79, "Au", 2, 1, 5, 11], [80, "Hg", 3, 1, 5, 12], [81, "Tl", 3, 0, 5, 13], [82, "Pb", 3, 1, 5, 14], [83, "Bi", 3, 0, 5, 15], [84, "Po", 3, 0, 5, 16], [85, "At", 6, 0, 5, 17], [86, "Rn", 7, 0, 5, 18], [87, "Fr", 0, 0, 6, 1], [88, "Ra", 1, 0, 6, 2], [89, "Ac", 9, 0, 8, 3], [90, "Th", 9, 0, 8, 4], [91, "Pa", 9, 0, 8, 5], [92, "U", 9, 0, 8, 6], [93, "Np", 9, 0, 8, 7], [94, "Pu", 9, 0, 8, 8], [95, "Am", 9, 0, 8, 9], [96, "Cm", 9, 0, 8, 10], [97, "Bk", 9, 0, 8, 11], [98, "Cf", 9, 0, 8, 12], [99, "Es", 9, 0, 8, 13], [100, "Fm", 9, 0, 8, 14], [101, "Md", 9, 0, 8, 15], [102, "No", 9, 0, 8, 16], [103, "Lr", 3, 0, 8, 17], [104, "Rf", 2, 0, 6, 4], [105, "Db", 2, 0, 6, 5], [106, "Sg", 2, 0, 6, 6], [107, "Bh", 2, 0, 6, 7], [108, "Hs", 2, 0, 6, 8], [109, "Mt", 2, 0, 6, 9], [110, "Ds", 2, 0, 6, 10], [111, "Rg", 2, 0, 6, 11], [112, "Cn", 3, 0, 6, 12], [113, "Nh", 3, 0, 6, 13], [114, "Fl", 3, 0, 6, 14], [115, "Mc", 3, 0, 6, 15], [116, "Lv", 3, 0, 6, 16], [117, "Ts", 6, 0, 6, 17], [118, "Og", 7, 0, 6, 18]];   // [z, sym, catIdx, core, rowIdx, col]，118 项
var PAL = [["#2c1921", "#ff6b6b", "#5f2d33", "#ff9595"], ["#2c211d", "#ffa94d", "#5f4229", "#ffec6b"], ["#171b34", "#5c7cfa", "#283364", "#80adff"], ["#152233", "#4dabf7", "#234362", "#6befff"], ["#192823", "#69db7c", "#2c5339", "#93ffad"], ["#2c271b", "#ffd43b", "#5f5123", "#ffff52"], ["#2b1c2a", "#f783ac", "#5d3549", "#ffb7f0"], ["#221f34", "#b197fc", "#453c64", "#f7d3ff"], ["#102732", "#22d3ee", "#14505f", "#2fffff"], ["#1c1e33", "#818cf8", "#343863", "#b4c4ff"]];
// index page — 高考版周期表：表冠纵向滚 + 横向 touch 滑动换列 + 100% 自适应缩放
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
export default {
  data: {
    title: L.title, badge: L.badge, hint: L.hint,
    pageW: 370,
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
    this.pageW = Math.floor(W * 0.98);   // 容器级宽度随窗口实测算（100% 自适应，不写死分辨率）
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
// 横向滑动换列（list 的 onswipe 事件，skill 实锤比 div touch 可靠；e.direction/e.distance）
  // direction 'right' = 手向右滑 = 看左边列（start-1）；'left' = 看右边列（start+1）
  onSwipe: function (e) {
    if (!e || e.direction !== 'left' && e.direction !== 'right') { return; }
    var d = e.distance || 0;
    if (d < 30) { return; }  // 轻扫防误触
    if (e.direction === 'right') { this.start = Math.max(0, this.start - 1); this.rebuild(); }
    else { this.start = Math.min(18 - this.cols, this.start + 1); this.rebuild(); }
  },
  onOpenElement: function (z) {
    if (!z) { return; }
    var s = require('@system.storage');
    var r = require('@system.router');
    var jump = function () { if (r.replaceUrl) { r.replaceUrl({ uri: 'pages/detail/detail' }); } else { r.replace({ uri: 'pages/detail/detail' }); } };
    s.set({ key: 'pt_z', value: String(z), success: jump, fail: jump });
  }
};
