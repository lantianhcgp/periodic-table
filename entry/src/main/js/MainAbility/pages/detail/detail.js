// detail page — element info, prev/next in-place (no reload)
import FULL from '../../common/elements-full.js';

var CAT = {
  alk: { label: '\u78b1\u91d1\u5c5e', c: '#ff6b6b' },
  alk2: { label: '\u78b1\u571f\u91d1\u5c5e', c: '#ffa94d' },
  tr: { label: '\u8fc7\u6e21\u91d1\u5c5e', c: '#5c7cfa' },
  post: { label: '\u540e\u8fc7\u6e21\u91d1\u5c5e', c: '#4dabf7' },
  met: { label: '\u7c7b\u91d1\u5c5e', c: '#69db7c' },
  nm: { label: '\u975e\u91d1\u5c5e', c: '#ffd43b' },
  hal: { label: '\u5318\u7d20', c: '#f783ac' },
  nob: { label: '\u7a00\u6709\u6c14\u4f53', c: '#b197fc' },
  lan: { label: '\u956d\u7cfb', c: '#22d3ee' },
  act: { label: '\u9551\u7cfb', c: '#818cf8' }
};

function byZ(z) {
  var r = FULL[z - 1];
  return r ? r : null;
}
// FULL row: [z,sym,cn,en,w,cat,conf,ox[],core,notes[],'period|group',shells]

function fill(page) {
  var el = byZ(page.z);
  if (!el) { page.hasData = 0; return; }
  page.hasData = 1;
  page.sym = el[1];
  page.cn = el[2];
  page.en = el[3];
  page.w = el[4];
  var cat = CAT[el[5]] || { label: el[5], c: '#888' };
  page.catLabel = cat.label;
  page.catColor = cat.c;
  page.conf = el[6];
  // oxidation states
  var ox = el[7] || [];
  var oxText = '';
  for (var i = 0; i < ox.length; i++) {
    if (i) { oxText += ' '; }
    oxText += (ox[i] > 0 ? '+' : '') + ox[i];
  }
  page.oxText = oxText;
  page.hasOx = ox.length > 0 ? 1 : 0;
  page.core = el[8] ? 1 : 0;
  // notes (cap 3)
  var notes = el[9] || [];
  var shown = notes.slice(0, 3);
  if (!shown.length) {
    shown = (el[8]) ? [] : ['\u975e\u9ad8\u8003\u6838\u5fc3\u8003\u70b9\uff0c\u8bb0\u4f4f\u7b26\u53f7\u4e0e\u4f4d\u7f6e\u5373\u53ef'];
  }
  page.notes = shown;
  page.notesK = el[8] ? '\u9ad8\u8003\u8981\u70b9' : '\u7b80\u4ecb';
  // period | group
  var pg = (el[10] || '').split('|');
  page.period = pg[0] || '';
  page.group = pg[1] || '';
  // shells
  var sh = (el[11] || '').split(',');
  var shells = [];
  for (var s = 0; s < sh.length; s++) {
    if (sh[s]) { shells.push({ n: sh[s] }); }
  }
  page.shells = shells;
  page.shellText = sh.join(' ');
  // index / progress
  page.idx = el[0];
  page.total = 118;
  page.barPct = Math.round(el[0] / 118 * 100);
  // 核结构（高考：原子序数=质子数=核外电子数；中子数=质量数-质子数）
  var massStr = String(el[4]).replace(/[()\[\]]/g, "");
  var massNum = Math.round(parseFloat(massStr));
  if (isNaN(massNum)) { massNum = 0; }
  page.massNum = massNum;
  page.neutrons = massNum - el[0];
  // 最外层电子数 = 电子层末位（高考：最高正价=最外层电子数，最低负价=最外层-8）
  var outerV = "";
  var shAll = (el[11] || "").split(",");
  for (var t = shAll.length - 1; t >= 0; t--) { if (shAll[t]) { outerV = shAll[t]; break; } }
  page.outer = outerV;
  // prev / next
  var prev = byZ(el[0] - 1);
  var next = byZ(el[0] + 1);
  page.prevSym = prev ? prev[1] : '';
  page.nextSym = next ? next[1] : '';
  page.canPrev = prev ? 1 : 0;
  page.canNext = next ? 1 : 0;
}

export default {
  data: {
    z: 1,
    hasData: 0,
    sym: '', cn: '', en: '', w: '',
    catLabel: '', catColor: '#888',
    conf: '', oxText: '', hasOx: 0,
    core: 0, notes: [], notesK: '',
    period: '', group: '', shells: [], shellText: '',
    massNum: 0, neutrons: 0, outer: '',
    kProton: '\u8d28\u5b50\u6570', kNeutron: '\u4e2d\u5b50\u6570', kOuter: '\u6700\u5916\u5c42\u7535\u5b50',
    idx: 0, total: 118, barPct: 0,
    prevSym: '', nextSym: '', canPrev: 0, canNext: 0,
    headTtl: '\u5143 \u7d20 \u8be6 \u60c5',
    kPeriod: '\u5468\u671f \u00b7 \u65cf',
    kAtomic: '\u539f\u5b50\u5e8f\u6570',
    kMass: '\u76f8\u5bf9\u539f\u5b50\u8d28\u91cf',
    kConf: '\u7535\u5b50\u6392\u5e03',
    kShell: '\u7535\u5b50\u5c42',
    kOx: '\u5e38\u89c1\u5316\u5408\u4ef7',
    bPrev: '\u4e0a\u4e00',
    bNext: '\u4e0b\u4e00',
    bBack: '\u8fd4\u56de',
    star: '\u2605',
    coreWord: '\u9ad8\u8003\u6838\u5fc3',
    progLab: '\u7ffb\u9605'
  },
  onInit: function () {
    var self = this;
    var storage = require('@system.storage');
    storage.get({
      key: 'pt_z', default: '1',
      success: function (v) {
        var z = parseInt(v, 10);
        if (!z || z < 1 || z > 118) { z = 1; }
        self.z = z;
        fill(self);
      }
    });
  },
  go: function (d) {
    var nz = this.z + d;
    if (nz < 1 || nz > 118) { return; }
    this.z = nz;
    fill(this);
  },
  onPrev: function () { this.go(-1); },
  onNext: function () { this.go(1); },
  onBack: function () {
    var router = require('@system.router');
    router.replace({ uri: 'pages/index/index' });
  }
};
