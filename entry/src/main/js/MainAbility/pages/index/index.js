// index page — periodic table with zoom (1x/2x/3x) + 表冠纵向滚动 + 横向开窗
// 缩放：＋/－ 切 1×/2×/3×，◀▶ 横向开窗平移；静态 div（表冠滚动需 <list>，FIT3 512KB 堆上 <list>+162 格 OOM，故退回）
// 缩放：zoom 0/1/2 → 横向窗口 18/10/7 列，格子 20/36/50px；放大窗口窄=渲染节点更少=省堆
var PAL = [["#2c1921", "#ff6b6b", "#5f2d33", "#ff9595"], ["#2c211d", "#ffa94d", "#5f4229", "#ffec6b"], ["#171b34", "#5c7cfa", "#283364", "#80adff"], ["#152233", "#4dabf7", "#234362", "#6befff"], ["#192823", "#69db7c", "#2c5339", "#93ffad"], ["#2c271b", "#ffd43b", "#5f5123", "#ffff52"], ["#2b1c2a", "#f783ac", "#5d3549", "#ffb7f0"], ["#221f34", "#b197fc", "#453c64", "#f7d3ff"], ["#102732", "#22d3ee", "#14505f", "#2fffff"], ["#1c1e33", "#818cf8", "#343863", "#b4c4ff"]];
var POS = {"0_1": [1, "H", 5, 1], "0_18": [2, "He", 7, 1], "1_1": [3, "Li", 0, 1], "1_2": [4, "Be", 1, 1], "1_3": [5, "B", 4, 1], "1_4": [6, "C", 5, 1], "1_5": [7, "N", 5, 1], "1_6": [8, "O", 5, 1], "1_7": [9, "F", 6, 1], "1_8": [10, "Ne", 7, 1], "2_1": [11, "Na", 0, 1], "2_2": [12, "Mg", 1, 1], "2_3": [13, "Al", 3, 1], "2_4": [14, "Si", 4, 1], "2_5": [15, "P", 5, 1], "2_6": [16, "S", 5, 1], "2_7": [17, "Cl", 6, 1], "2_8": [18, "Ar", 7, 1], "3_1": [19, "K", 0, 1], "3_2": [20, "Ca", 1, 1], "3_3": [21, "Sc", 2, 0], "3_4": [22, "Ti", 2, 0], "3_5": [23, "V", 2, 0], "3_6": [24, "Cr", 2, 1], "3_7": [25, "Mn", 2, 1], "3_8": [26, "Fe", 2, 1], "3_9": [27, "Co", 2, 0], "3_10": [28, "Ni", 2, 0], "3_11": [29, "Cu", 2, 1], "3_12": [30, "Zn", 3, 1], "3_13": [31, "Ga", 3, 0], "3_14": [32, "Ge", 4, 0], "3_15": [33, "As", 4, 0], "3_16": [34, "Se", 5, 0], "3_17": [35, "Br", 6, 1], "3_18": [36, "Kr", 7, 0], "4_1": [37, "Rb", 0, 0], "4_2": [38, "Sr", 1, 0], "4_3": [39, "Y", 2, 0], "4_4": [40, "Zr", 2, 0], "4_5": [41, "Nb", 2, 0], "4_6": [42, "Mo", 2, 0], "4_7": [43, "Tc", 2, 0], "4_8": [44, "Ru", 2, 0], "4_9": [45, "Rh", 2, 0], "4_10": [46, "Pd", 2, 0], "4_11": [47, "Ag", 2, 1], "4_12": [48, "Cd", 3, 0], "4_13": [49, "In", 3, 0], "4_14": [50, "Sn", 3, 1], "4_15": [51, "Sb", 4, 0], "4_16": [52, "Te", 4, 0], "4_17": [53, "I", 6, 1], "4_18": [54, "Xe", 7, 0], "5_1": [55, "Cs", 0, 0], "5_2": [56, "Ba", 1, 1], "7_3": [57, "La", 8, 0], "7_4": [58, "Ce", 8, 0], "7_5": [59, "Pr", 8, 0], "7_6": [60, "Nd", 8, 0], "7_7": [61, "Pm", 8, 0], "7_8": [62, "Sm", 8, 0], "7_9": [63, "Eu", 8, 0], "7_10": [64, "Gd", 8, 0], "7_11": [65, "Tb", 8, 0], "7_12": [66, "Dy", 8, 0], "7_13": [67, "Ho", 8, 0], "7_14": [68, "Er", 8, 0], "7_15": [69, "Tm", 8, 0], "7_16": [70, "Yb", 8, 0], "7_17": [71, "Lu", 8, 0], "5_4": [72, "Hf", 2, 0], "5_5": [73, "Ta", 2, 0], "5_6": [74, "W", 2, 1], "5_7": [75, "Re", 2, 0], "5_8": [76, "Os", 2, 0], "5_9": [77, "Ir", 2, 0], "5_10": [78, "Pt", 2, 1], "5_11": [79, "Au", 2, 1], "5_12": [80, "Hg", 3, 1], "5_13": [81, "Tl", 3, 0], "5_14": [82, "Pb", 3, 1], "5_15": [83, "Bi", 3, 0], "5_16": [84, "Po", 3, 0], "5_17": [85, "At", 6, 0], "5_18": [86, "Rn", 7, 0], "6_1": [87, "Fr", 0, 0], "6_2": [88, "Ra", 1, 0], "8_3": [89, "Ac", 9, 0], "8_4": [90, "Th", 9, 0], "8_5": [91, "Pa", 9, 0], "8_6": [92, "U", 9, 0], "8_7": [93, "Np", 9, 0], "8_8": [94, "Pu", 9, 0], "8_9": [95, "Am", 9, 0], "8_10": [96, "Cm", 9, 0], "8_11": [97, "Bk", 9, 0], "8_12": [98, "Cf", 9, 0], "8_13": [99, "Es", 9, 0], "8_14": [100, "Fm", 9, 0], "8_15": [101, "Md", 9, 0], "8_16": [102, "No", 9, 0], "8_17": [103, "Lr", 3, 0], "6_4": [104, "Rf", 2, 0], "6_5": [105, "Db", 2, 0], "6_6": [106, "Sg", 2, 0], "6_7": [107, "Bh", 2, 0], "6_8": [108, "Hs", 2, 0], "6_9": [109, "Mt", 2, 0], "6_10": [110, "Ds", 2, 0], "6_11": [111, "Rg", 2, 0], "6_12": [112, "Cn", 3, 0], "6_13": [113, "Nh", 3, 0], "6_14": [114, "Fl", 3, 0], "6_15": [115, "Mc", 3, 0], "6_16": [116, "Lv", 3, 0], "6_17": [117, "Ts", 6, 0], "6_18": [118, "Og", 7, 0], "5_3": [0, "57~71", 8, 0], "6_3": [0, "89~103", 9, 0]};
var ZC = [{"cols": 18, "w": 20, "h": 20, "fs": 9}, {"cols": 10, "w": 36, "h": 40, "fs": 17}, {"cols": 7, "w": 50, "h": 54, "fs": 26}];
var LEGEND = [["\u78b1\u91d1\u5c5e", "#ff6b6b"], ["\u78b1\u571f", "#ffa94d"], ["\u8fc7\u6e21", "#5c7cfa"], ["\u540e\u8fc7\u6e21", "#4dabf7"], ["\u7c7b\u91d1\u5c5e", "#69db7c"], ["\u975e\u91d1\u5c5e", "#ffd43b"], ["\u5364\u7d20", "#f783ac"], ["\u7a00\u6709\u6c14\u4f53", "#b197fc"], ["\u9567\u7cfb", "#22d3ee"], ["\u9515\u7cfb", "#818cf8"]];
var L = {"title": "\u5143\u7d20\u5468\u671f\u8868", "badge": "\u9ad8\u8003\u7248 \u00b7 35 \u6838\u5fc3", "hint": "\u70b9\u6309\u5143\u7d20\u67e5\u770b\u8be6\u60c5 \u00b7 \u4eae\u8272 = \u9ad8\u8003\u6838\u5fc3"};
var PAGE = '#0d0d16';
function rowOf(r, start, cols){
  var out = [];
  for (var c = start; c < start + cols; c++) {
    var p = POS[r + '_' + (c + 1)];
    if (p) { out.push({ z: p[0], sym: p[1], bg: PAL[p[2]][p[3] ? 2 : 0], color: PAL[p[2]][p[3] ? 3 : 1] }); }
    else { out.push({ z: 0, sym: '', bg: PAGE, color: 'transparent' }); }
  }
  return out;
}
export default {
  data: {
    title: L.title, badge: L.badge, hint: L.hint, legend: LEGEND,
    zoom: 0, start: 0, zoomLabel: '1×',
    listH: Math.min(ZC[0].h * 9 + 24, 382),
    cw: ZC[0].w, ch: ZC[0].h, fs: ZC[0].fs, fsph: Math.max(6, ZC[0].fs - 3),
    r0: rowOf(0, 0, ZC[0].cols), r1: rowOf(1, 0, ZC[0].cols), r2: rowOf(2, 0, ZC[0].cols),
    r3: rowOf(3, 0, ZC[0].cols), r4: rowOf(4, 0, ZC[0].cols), r5: rowOf(5, 0, ZC[0].cols),
    r6: rowOf(6, 0, ZC[0].cols), r7: rowOf(7, 0, ZC[0].cols), r8: rowOf(8, 0, ZC[0].cols)
  },
  rebuild: function () {
    var cols = ZC[this.zoom].cols, i = this.start;
    this.r0 = rowOf(0, i, cols);
    this.r1 = rowOf(1, i, cols);
    this.r2 = rowOf(2, i, cols);
    this.r3 = rowOf(3, i, cols);
    this.r4 = rowOf(4, i, cols);
    this.r5 = rowOf(5, i, cols);
    this.r6 = rowOf(6, i, cols);
    this.r7 = rowOf(7, i, cols);
    this.r8 = rowOf(8, i, cols);
    this.cw = ZC[this.zoom].w; this.ch = ZC[this.zoom].h;
    this.fs = ZC[this.zoom].fs; this.fsph = Math.max(6, ZC[this.zoom].fs - 3);
    this.listH = Math.min(ZC[this.zoom].h * 9 + 24, 382);
    this.zoomLabel = (this.zoom + 1) + '×';
  },
  zoomIn: function () {
    if (this.zoom < 2) {
      this.zoom++;
      var mx = 18 - ZC[this.zoom].cols;
      if (this.start > mx) { this.start = mx; }
      this.rebuild();
    }
  },
  zoomOut: function () {
    if (this.zoom > 0) {
      this.zoom--;
      var mx = 18 - ZC[this.zoom].cols;
      if (this.start > mx) { this.start = mx; }
      this.rebuild();
    }
  },
  panLeft: function () { if (this.start > 0) { this.start--; this.rebuild(); } },
  panRight: function () { var mx = 18 - ZC[this.zoom].cols; if (this.start < mx) { this.start++; this.rebuild(); } },
  onOpenElement: function (z) {
    if (!z) { return; }
    var storage = require('@system.storage');
    var router = require('@system.router');
    storage.set({
      key: 'pt_z', value: String(z),
      success: function () { router.replace({ uri: 'pages/detail/detail' }); },
      fail: function () { router.replace({ uri: 'pages/detail/detail' }); }
    });
  }
};
