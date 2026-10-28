const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const MAIN = path.join(ROOT, 'entry/src/main/js/MainAbility');
function load(file, env = {}) {
  let src = fs.readFileSync(path.join(MAIN, file), 'utf8');
  src = src.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports =');
  const box = { module: { exports: {} }, Math, Date, console:{info(){},warn(){},error(){}}, ...env };
  vm.runInNewContext(src, box, {filename: file, timeout: 1000});
  return box.module.exports;
}
function model() { return load('common/model.js'); }
function catalog() { return load('common/catalog.js'); }
function grid() { return load('common/grid.js'); }
let ok = 0, bad = 0;
function test(name, f) {
  try { f(); ok++; console.log('PASS ' + name); }
  catch(e) { bad++; console.error('FAIL ' + name + ': ' + e.message); }
}
const dims = [[336,396],[412,484],[454,454],[466,466],[280,456]];
test('no fabricated device resolution on absent/invalid response', () => {
  const m = model();
  assert.equal(m.viewport({}), null);
  assert.equal(m.viewport({windowWidth:0,windowHeight:0}), null);
  assert.equal(m.viewport({windowWidth:NaN,windowHeight:484}), null);
  assert.equal(m.viewport({windowWidth:412,windowHeight:484}).w, 412);
});
test('every layout fits real viewport and retains safe footer', () => {
  const m = model();
  for(const [w,h] of dims) for(const z of [1,2,3]) {
    const l = m.layout(w,h,z);
    assert(l.tableW > 0 && l.tableW <= w);
    assert(l.listH > 0);
    assert(l.headerH + l.listH + l.hintH + l.footerH + l.bottomH <= h);
    assert(l.footerBottom <= h * .85);
    assert(l.btnW * 3 + l.btnGap * 6 <= l.footerW + 1);
    assert(l.font >= 14);
  }
});
test('2x and 3x are real content scale, never toolbar scale', () => {
  const m = model();
  for(const [w,h] of dims) {
    const a=m.layout(w,h,1), b=m.layout(w,h,2), c=m.layout(w,h,3);
    assert.equal(a.cols,6); assert.equal(b.cols,3); assert.equal(c.cols,2);
    assert.equal(b.tileW, a.tileW*2); assert.equal(c.tileW,a.tileW*3);
    for(const key of ['headerH','listH','footerH','footerW','btnW','btnGap','font']) {
      assert.equal(a[key], b[key], key); assert.equal(a[key], c[key], key);
    }
  }
});
test('all 118 elements reachable at all zooms, with distinct La and Ac rows', () => {
  const m=model();
  for(const zoom of [1,2,3]) {
    const seen=new Set(), cols=m.columns(zoom);
    for(let start=0;start<=18-cols;start++) for(let row=0;row<9;row++) for(let slot=0;slot<cols;slot++) {
      const z=m.cell(row,slot,start,zoom);if(z>0)seen.add(z);
    }
    assert.equal(seen.size,118);
    for(let z=1;z<=118;z++) assert(seen.has(z),'missing '+z);
  }
  assert.equal(m.at(7,3),57);
  assert.equal(m.at(8,3),89);
});
test('horizontal swipes move bounded viewport without arrow controls', () => {
  const m=model();
  assert.equal(m.shift(0,1,'left'),5);
  assert.equal(m.shift(0,1,'right'),0);
  assert.equal(m.shift(12,1,'left'),12);
  assert.equal(m.shift(14,2,'left'),15);
  assert.equal(m.shift(15,2,'right'),13);
  const hml=fs.readFileSync(path.join(MAIN,'pages/index/index.hml'),'utf8');
  assert(hml.includes('onSwipe') && hml.includes('onscrollend="onScrollEnd"'));
  assert(hml.includes('<canvas') && hml.includes('openRow'));
  assert(!hml.includes('panLeft') && !hml.includes('panRight'));
});
test('compact canvas labels cover all elements without packaged tile bitmaps', () => {
  const g=grid(), cat=catalog();
  for(let z=1;z<=118;z++) {
    const e=cat.get(z);assert.equal(g.symbol(z),e.symbol);assert.equal(g.name(z),e.cn);assert.equal(g.isCore(z),e.core);assert(g.color(z));
  }
  assert.equal(g.symbol(-1),'57-71');assert.equal(g.name(-2),'锕系');
  assert(!fs.existsSync(path.join(MAIN,'common/tiles')),'per-element bitmaps must not be packaged');
  assert(fs.statSync(path.join(MAIN,'common/grid.js')).size<4096);
});
test('catalog contains exactly 118 complete, electron-consistent records', () => {
  const cat=catalog();
  for(let z=1;z<=118;z++) {
    const e=cat.get(z);
    assert.equal(e.z,z); assert(e.symbol && e.cn && e.en);
    assert.equal(e.shells.reduce((a,b)=>a+b,0),z, e.symbol);
    assert.equal(e.protons,z);
    assert.equal(e.electrons,z);
    assert(e.period >= 1 && e.period <= 7);
    assert(e.config && e.group && e.weightKind && e.weight && e.keyPoint);
    for(const a of e.isotopes) assert(Number.isInteger(a) && a>=z);
  }
  assert.equal(cat.get(0),null); assert.equal(cat.get(119),null);
});
test('chlorine isotopes are Cl-35 (18n) and Cl-37 (20n), not averaged mass', () => {
  const m=model(), e=catalog().get(17);
  assert(e.isotopes.includes(35) && e.isotopes.includes(37));
  assert.equal(m.nucleus(17,35).neutrons,18);
  assert.equal(m.nucleus(17,37).neutrons,20);
});
test('hydrogen and carbon explicitly cover three isotope examples', () => {
  const cat=catalog();
  assert.deepEqual(Array.from(cat.get(1).isotopes),[1,2,3]);
  assert.deepEqual(Array.from(cat.get(6).isotopes),[12,13,14]);
  assert.equal(model().nucleus(1,3).neutrons,2);
  assert.equal(model().nucleus(6,14).neutrons,8);
});
test('Cu and Br representative neutrons are never obtained by rounding average mass', () => {
  const cat=catalog(), m=model();
  const cu=cat.get(29), br=cat.get(35);
  assert(cu.isotopes.includes(63) && cu.isotopes.includes(65));
  assert(br.isotopes.includes(79) && br.isotopes.includes(81));
  assert.equal(m.nucleus(29,63).neutrons,34);
  assert.equal(m.nucleus(29,65).neutrons,36);
  assert.equal(m.nucleus(35,79).neutrons,44);
  assert.equal(m.nucleus(35,81).neutrons,46);
  assert.equal(m.nucleus(17,35.45),null);
  assert.equal(m.nucleus(17,12),null);
});
test('He and O/F do not inherit false valence rules', () => {
  const cat=catalog();
  assert.equal(cat.get(2).shells.at(-1),2);
  assert(cat.get(2).keyPoint.includes('2'));
  assert(cat.get(8).keyPoint.includes('例外'));
  assert(cat.get(9).keyPoint.includes('例外'));
  assert.equal(cat.get(118).weightKind,'nuclide');
  const officialNames={104:'𬬻',105:'𬭊',106:'𬭳',107:'𬭛',108:'𬭶',109:'鿏',110:'𫟼',111:'𬬭',112:'鿔',113:'鿭',114:'𫓧',115:'镆',116:'𫟷',117:'鿬',118:'鿫'};
  for(const [z,cn] of Object.entries(officialNames)) assert.equal(cat.get(Number(z)).cn,cn,'Z='+z);
});
test('detail UI shows isotope data, independent scroll/footer and no packaged tile image', () => {
  const hml=fs.readFileSync(path.join(MAIN,'pages/detail/detail.hml'),'utf8');
  for(const token of ['detailList','isoLabel','massNumber','neutronCount','protonCount','electronCount','nucleusNote','nameCN','back']) assert(hml.includes(token),token);
  assert(hml.includes('switchIsotope') && hml.includes('onscrollend="onScrollEnd"'));
  assert(hml.includes('nameSymbol') && hml.includes('tileColor'));
  assert(!hml.includes('tileSrc') && !hml.includes('<image'));
  assert(!hml.includes('Math.round'));
});
test('launcher configuration uses the newly generated 114px and 80px element-card icons', () => {
  const config=JSON.parse(fs.readFileSync(path.join(ROOT,'entry/src/main/config.json'),'utf8'));
  assert.equal(config.module.abilities[0].icon,'$media:icon');
  assert.equal(config.app.bundleName,'periodic.nexus.qu84q');
  assert.equal(config.app.version.code,1001000);
  function size(name){const b=fs.readFileSync(path.join(ROOT,'entry/src/main/resources/base/media',name));assert.equal(b.toString('ascii',1,4),'PNG');return [b.readUInt32BE(16),b.readUInt32BE(20),b.length];}
  const normal=size('icon.png'), small=size('icon_small.png');
  assert.deepEqual(normal.slice(0,2),[114,114]);assert.deepEqual(small.slice(0,2),[80,80]);
  assert(normal[2]<5120 && small[2]<5120);
});
test('source no fabricated dimension fallback, unsupported modern syntax or full dataset object import', () => {
  for(const file of ['pages/index/index.js','pages/detail/detail.js','common/model.js','common/grid.js']) {
    const s=fs.readFileSync(path.join(MAIN,file),'utf8');
    assert(!s.includes('elements-full'));
    assert(!/windowWidth\s*\|\|\s*412/.test(s));
    assert(!/async\s+function|await\s|\?\.|=>/.test(s));
  }
  const css=fs.readFileSync(path.join(MAIN,'pages/index/index.css'),'utf8');
  assert(css.includes('width: 100%') && css.includes('height: 100%'));
});
test('canvas table draws nine rows and click mapping selects chlorine after horizontal pan', () => {
  const jobs=new Map();let next=0;const routes=[],texts=[];
  function context(){return {fillRect(){},fillText(v){texts.push(String(v));},beginPath(){},arc(){},fill(){}};}
  const page=load('pages/index/index.js',{
    model:model(),grid:grid(),device:{getInfo(o){o.success({windowWidth:412,windowHeight:484});}},
    router:{replace(o){routes.push(o.uri);}},
    setTimeout(f){const id=++next;jobs.set(id,f);return id;},clearTimeout(id){jobs.delete(id);}
  });
  const p=Object.assign({},page.data,page);p.$app={$def:{selectedElement:0,tableZoom:1,tableColumn:0}};
  p.$refs={tableList:{rotation(){},scrollTo(){}}};for(let r=0;r<9;r++)p.$refs['c'+r]={getContext(){return context();}};
  p.onInit();
  while(jobs.size){const first=[...jobs.entries()].sort((a,b)=>a[0]-b[0])[0];jobs.delete(first[0]);first[1]();}
  assert(texts.includes('H') && texts.includes('氢') && texts.includes('Li'),'texts='+JSON.stringify(texts.slice(0,20)));
  p.colStart=12;p.layout();p.scheduleCanvas();p.lastSwipeAt=0;p.moved=false;
  p.touchStart({globalX:p.margin+p.tileW*4.5,globalY:200});p.openRow(2);
  assert.equal(p.$app.$def.selectedElement,17);assert.equal(routes.at(-1),'pages/detail/detail');
  p.onDestroy();assert.equal(jobs.size,0);
});
test('catalog is owned once by app state so detail page stays below Lite page budget', () => {
  const app=load('app.js',{catalog:catalog()});
  assert.equal(app.getElement(17).symbol,'Cl');assert.equal(app.getElement(119),null);
  const detail=fs.readFileSync(path.join(MAIN,'pages/detail/detail.js'),'utf8');
  assert(!detail.includes("common/catalog"));assert(detail.includes('a.getElement'));
});
test('detail integrates selected chlorine, isotope switch and back route', () => {
  const jobs=new Map();let next=0;const routes=[];
  const page=load('pages/detail/detail.js',{
    model:model(),
    device:{getInfo(o){o.success({windowWidth:412,windowHeight:484});}},
    router:{replace(o){routes.push(o.uri);}},
    setTimeout(f){const id=++next;jobs.set(id,f);return id;},clearTimeout(id){jobs.delete(id);}
  });
  const p=Object.assign({},page.data,page);
  p.$app={$def:{selectedElement:17,getElement(z){return catalog().get(z);}}};p.$refs={detailList:{rotation(){}}};
  p.onInit();
  assert.equal(p.ready,true);assert.equal(p.z,17);assert.equal(p.nameCN,'氯');
  assert.equal(p.isoLabel,'Cl-35');assert.equal(p.protonCount,17);assert.equal(p.neutronCount,18);
  p.switchIsotope(1);assert.equal(p.isoLabel,'Cl-37');assert.equal(p.neutronCount,20);
  p.back();assert.equal(routes.at(-1),'pages/index/index');
  p.onDestroy();assert.equal(jobs.size,0);assert.equal(p.meta,null);
});
test('timer cleanup invalidates hidden-page callback and bounds pending focus to one', () => {
  const jobs=new Map(); let n=0; const calls=[];
  const page=load('pages/index/index.js',{
    model:model(),grid:grid(),device:{getInfo(o){o.success({windowWidth:412,windowHeight:484});}},
    router:{replace(o){calls.push(o);}},
    setTimeout(f){const id=++n;jobs.set(id,f);return id;},
    clearTimeout(id){jobs.delete(id);}
  });
  const p=Object.assign({},page.data,page);
  p.$refs={tableList:{rotation(){},scrollTo(){}}};for(let r=0;r<9;r++)p.$refs['c'+r]={getContext(){return {fillRect(){},fillText(){},beginPath(){},arc(){},fill(){}};}};
  p.onInit(); p.onShow();
  for(let i=0;i<100;i++) {p.zoomIn();p.zoomOut();p.onSwipe({direction:'left'});}
  assert(jobs.size<=2,'pending jobs='+jobs.size);
  p.onHide(); assert.equal(jobs.size,0);
  p.onDestroy(); assert.equal(jobs.size,0);
});
console.log(JSON.stringify({passed:ok,failed:bad}));
if(bad) process.exitCode=1;
