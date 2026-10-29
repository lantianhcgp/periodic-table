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
test('adaptive atlas layout reclaims the old footer and uses one fixed scale', () => {
  const m = model();
  for(const [w,h] of dims) {
    const l = m.layout(w,h);
    assert(l.viewportW > 0 && l.viewportW <= w);
    assert(l.viewportH >= h*.72, JSON.stringify(l));
    assert(l.headerH + l.viewportH + l.safeBottom <= h);
    assert.equal(l.tileW*6,l.viewportW);
    assert.equal(l.atlasW,l.tileW*18);
    assert.equal(l.atlasH,l.tileH*9);
    assert(l.atlasW>l.viewportW && l.atlasH>l.viewportH);
  }
});
test('detail layout remains finite and bounded after atlas homepage migration', () => {
  const m=model(),cat=catalog();
  for(const [w,h] of dims) {
    const page=load('pages/detail/detail.js',{
      model:m,getApp(){return {selectedElement:17,getElement(z){return cat.get(z);}};},
      device:{getInfo(o){o.success({windowWidth:w,windowHeight:h});}},
      router:{replace(){}},setTimeout(){return 1;},clearTimeout(){}
    });
    const p=Object.assign({},page.data,page);p.onInit();
    assert.equal(p.ready,true);
    for(const key of ['tableW','headerW','headerH','listH','footerW','footerH','cardW','thirdW','halfW','iconW','iconH','nameW','nameH','heroH','structureH','nucleusH','electronH','positionH','valenceH','noteH','isoW','isoH','pointH','noteTextH']) {
      assert(Number.isFinite(p[key]) && p[key]>0,key+'='+p[key]+' at '+w+'x'+h);
    }
    assert(p.tableW<=w && p.footerW<=w && p.cardW<=p.tableW);
    assert(p.headerH+p.listH+p.footerH<=h-Math.ceil(h*.14),'detail return button must stay inside bottom safe area');
    p.onDestroy();
  }
});
test('full fixed grid contains all 118 elements with distinct La and Ac rows', () => {
  const m=model();
  const seen=new Set();
  for(let row=0;row<9;row++) for(let col=0;col<18;col++){const z=m.at(row,col);if(z>0)seen.add(z);}
  assert.equal(seen.size,118);
  for(let z=1;z<=118;z++) assert(seen.has(z),'missing '+z);
  assert.equal(m.at(7,3),57);
  assert.equal(m.at(8,3),89);
});
test('homepage is one atlas image with continuous two-axis touch, no canvas zoom or paging', () => {
  const m=model();
  const l=m.layout(412,484);
  let pan=m.clampPan(-17.5,-11.25,l);assert.equal(pan.left,-17.5);assert.equal(pan.top,-11.25);
  pan=m.clampPan(99,88,l);assert.equal(pan.left,0);assert.equal(pan.top,0);
  pan=m.clampPan(-9999,-9999,l);assert.equal(pan.left,l.viewportW-l.atlasW);assert.equal(pan.top,l.viewportH-l.atlasH);
  const left=l.viewportW-l.atlasW, top=Math.max(l.viewportH-l.atlasH,-l.tileH);
  const localX=left+16.5*l.tileW, localY=top+2.5*l.tileH;
  assert.equal(m.hit(localX,localY,left,top,l),17);
  const hml=fs.readFileSync(path.join(MAIN,'pages/index/index.hml'),'utf8');
  for(const token of ['<stack','<image','<slider','periodic_table_atlas.png','@touchstart="touchStart"','@touchmove="touchMove"','@touchend="touchEnd"','@touchcancel="touchCancel"','@change="listenCrown"']) assert(hml.includes(token),token);
  assert(!/<canvas|<list|zoom|onSwipe|tool-symbol|1×|2×|3×/.test(hml));
  const js=fs.readFileSync(path.join(MAIN,'pages/index/index.js'),'utf8');
  assert(!/zoomIn|zoomOut|colStart|scheduleCanvas|drawAll|onSwipe|model\.shift/.test(js));
});
test('single atlas resource replaces runtime canvas text and per-element tile bitmaps', () => {
  const g=grid(), cat=catalog();
  for(let z=1;z<=118;z++) {
    const e=cat.get(z);assert.equal(g.symbol(z),e.symbol);assert.equal(g.name(z),e.cn);assert.equal(g.isCore(z),e.core);assert(g.color(z));
  }
  assert.equal(g.symbol(-1),'57-71');assert.equal(g.name(-2),'锕系');
  assert(!fs.existsSync(path.join(MAIN,'common/tiles')),'per-element bitmaps must not be packaged');
  assert(fs.statSync(path.join(MAIN,'common/grid.js')).size<4096);
  const atlas=path.join(MAIN,'common/periodic_table_atlas.png');
  assert(fs.existsSync(atlas),'atlas missing');
  const b=fs.readFileSync(atlas);assert.equal(b.toString('ascii',1,4),'PNG');
  assert.deepEqual([b.readUInt32BE(16),b.readUInt32BE(20)],[1152,648]);
  assert(fs.existsSync(path.join(ROOT,'tools/generate_table_atlas.py')));
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
test('continuous sub-tile drag is not quantized and tap after pan selects chlorine', () => {
  const routes=[];
  const appGlobal={selectedElement:0,tableLeft:0,tableTop:0};
  const page=load('pages/index/index.js',{
    model:model(),device:{getInfo(o){o.success({windowWidth:412,windowHeight:484});}},
    router:{replace(o){routes.push(o.uri);}},getApp(){return appGlobal;},
    setTimeout(){return 1;},clearTimeout(){},
  });
  const p=Object.assign({},page.data,page);
  const rotations=[];p.$refs={panCrown:{rotation(o){rotations.push(o&&o.focus);}}};
  p.onInit();
  assert.equal(p.ready,true);assert(p.viewportH>300);
  p.touchStart({globalX:300,globalY:220,timestamp:10});
  p.touchMove({globalX:282.5,globalY:208.25,timestamp:20});
  assert.equal(p.imageLeft,-17.5);assert.equal(p.imageTop,-11.75);
  p.touchEnd({globalX:282.5,globalY:208.25,timestamp:30});
  assert.equal(routes.length,0,'drag must not open detail');
  const beforeCrown=p.imageTop;p.listenCrown({value:49});assert.notEqual(p.imageTop,beforeCrown);
  p.focusCrown(true);assert(rotations.includes(true));
  p.imageLeft=0;p.imageTop=0;
  p.touchStart({globalX:300,globalY:220,timestamp:40});
  p.touchEnd({globalX:200,globalY:220,timestamp:60});
  assert.equal(routes.length,0,'fast swipe without intermediate move must not click');
  assert.equal(p.imageLeft,-100,'touchEnd must apply final displacement');
  p.touchStart({globalX:50,globalY:100,timestamp:70});p.touchCancel({globalX:50,globalY:100,timestamp:80});
  assert.equal(routes.length,0,'touchcancel must never click');
  p.touchStart({globalX:50,globalY:100,timestamp:100});p.touchEnd({globalX:50,globalY:100,timestamp:800});
  assert.equal(routes.length,0,'long hold must not be treated as tap');
  p.imageLeft=p.viewportW-p.atlasW;p.imageTop=0;
  const gx=p.margin+p.imageLeft+16.5*p.tileW, gy=p.headerH+2.5*p.tileH;
  p.touchStart({globalX:gx,globalY:gy,timestamp:100});
  p.touchEnd({globalX:gx,globalY:gy,timestamp:120});
  assert.equal(appGlobal.selectedElement,17);assert.equal(routes.at(-1),'pages/detail/detail');
  p.onDestroy();
});
for(const [dx,dy] of [[7,7],[8,0],[0,8]]) {
  test('Euclidean 8px drag threshold suppresses tap for ('+dx+','+dy+')', () => {
    const routes=[],appGlobal={selectedElement:0,tableLeft:0,tableTop:0};
    const page=load('pages/index/index.js',{
      model:model(),getApp(){return appGlobal;},
      device:{getInfo(o){o.success({windowWidth:412,windowHeight:484});}},
      router:{replace(o){routes.push(o.uri);}},setTimeout(){return 1;},clearTimeout(){}
    });
    const p=Object.assign({},page.data,page);p.onInit();
    const x=p.margin+p.tileW/2,y=p.headerH+p.tileH/2;
    p.touchStart({globalX:x,globalY:y,timestamp:10});
    p.touchMove({globalX:x+7,globalY:y,timestamp:20});
    assert.equal(p.moved,false,'movement below 8px must remain a tap candidate');
    p.touchMove({globalX:x+dx,globalY:y+dy,timestamp:30});
    p.touchEnd({globalX:x+dx,globalY:y+dy,timestamp:40});
    assert.equal(routes.length,0,'drag must not open the element beneath the release');
    assert.equal(p.moved,true);assert.equal(appGlobal.selectedElement,0);
    p.onDestroy();
  });
}
test('click-only tap opens an element and touch-generated click cannot replay a gesture', () => {
  const hml=fs.readFileSync(path.join(MAIN,'pages/index/index.hml'),'utf8');
  assert(hml.includes('@click="tap"'),'stationary simulator/device click must have a handler');
  let now=1000;const routes=[];const appGlobal={selectedElement:0,tableLeft:0,tableTop:0};
  const page=load('pages/index/index.js',{
    model:model(),Date:{now(){return now;}},getApp(){return appGlobal;},
    device:{getInfo(o){o.success({windowWidth:412,windowHeight:484});}},
    router:{replace(o){routes.push(o.uri);}},setTimeout(){return 1;},clearTimeout(){}
  });
  const p=Object.assign({},page.data,page);p.onInit();
  p.imageLeft=p.viewportW-p.atlasW;
  const e={globalX:p.margin+p.imageLeft+16.5*p.tileW,globalY:p.headerH+2.5*p.tileH};
  p.tap(e);assert.equal(appGlobal.selectedElement,17);assert.equal(routes.length,1);
  p.tap(e);assert.equal(routes.length,1,'same navigation must not reenter');
  p.leaving=false;routes.length=0;p.imageLeft=0;p.imageTop=0;
  p.touchStart({globalX:150,globalY:120});p.touchEnd({globalX:50,globalY:120});
  p.tap({globalX:50,globalY:120});assert.equal(routes.length,0,'drag release click must be suppressed');
  now+=200;p.imageLeft=p.viewportW-p.atlasW;p.imageTop=0;
  p.tap(e);assert.equal(routes.length,1,'fresh click after drag must work');
  p.leaving=false;routes.length=0;p.imageLeft=0;p.imageTop=0;
  p.touchStart({globalX:50,globalY:100});p.touchCancel({globalX:50,globalY:100});
  p.tap({globalX:50,globalY:100});assert.equal(routes.length,0,'cancel must suppress generated click');
  now+=200;p.tap();p.tap({});assert.equal(routes.length,0,'missing coordinates must not reuse a stale point');
  p.imageLeft=0;p.imageTop=-2*p.tileH;
  const marker={globalX:p.margin+2.5*p.tileW,globalY:p.headerH+3.5*p.tileH};
  p.touchStart(marker);p.touchEnd(marker);
  const top=p.imageTop;p.tap(marker);
  assert.equal(routes.length,0,'series jump must not immediately open the new cell below it');
  assert.equal(p.imageTop,top);p.onDestroy();
});
test('catalog is owned once by app state so detail page stays below Lite page budget', () => {
  const app=load('app.js',{catalog:catalog()});
  assert.equal(app.getElement(17).symbol,'Cl');assert.equal(app.getElement(119),null);
  const detail=fs.readFileSync(path.join(MAIN,'pages/detail/detail.js'),'utf8');
  assert(!detail.includes("common/catalog"));assert(detail.includes('a.getElement'));
});
test('detail integrates selected chlorine, isotope switch and back route', () => {
  const jobs=new Map();let next=0;const routes=[],rotations=[];
  const appGlobal={selectedElement:17,getElement(z){return catalog().get(z);}};
  const page=load('pages/detail/detail.js',{
    model:model(),getApp(){return appGlobal;},
    device:{getInfo(o){o.success({windowWidth:412,windowHeight:484});}},
    router:{replace(o){routes.push(o.uri);}},
    setTimeout(f){const id=++next;jobs.set(id,f);return id;},clearTimeout(id){jobs.delete(id);}
  });
  const p=Object.assign({},page.data,page);
  p.$refs={detailList:{rotation(o){rotations.push(o.focus);}}};
  p.onInit();
  while(jobs.size){const first=[...jobs.entries()][0];jobs.delete(first[0]);first[1]();}
  assert(rotations.includes(true));
  assert.equal(p.ready,true);assert.equal(p.z,17);assert.equal(p.nameCN,'氯');
  assert.equal(p.isoLabel,'Cl-35');assert.equal(p.protonCount,17);assert.equal(p.neutronCount,18);
  p.switchIsotope(1);assert.equal(p.isoLabel,'Cl-37');assert.equal(p.neutronCount,20);
  p.back();assert.equal(routes.at(-1),'pages/index/index');
  p.onDestroy();assert.equal(jobs.size,0);assert.equal(p.meta,null);
});
test('cold start schedules one crown focus job and lifecycle cleans it', () => {
  const calls=[],appGlobal={selectedElement:0,tableLeft:0,tableTop:0};
  const jobs=new Map(),rotations=[];let next=0;
  const page=load('pages/index/index.js',{
    model:model(),device:{getInfo(o){o.success({windowWidth:412,windowHeight:484});}},
    router:{replace(o){calls.push(o);}},getApp(){return appGlobal;},
    setTimeout(f){const id=++next;jobs.set(id,f);return id;},clearTimeout(id){jobs.delete(id);}
  });
  const p=Object.assign({},page.data,page);p.$refs={panCrown:{rotation(o){rotations.push(o&&o.focus);}}};
  p.onInit();assert.equal(jobs.size,1,'cold ready must schedule focus');
  p.onShow();assert.equal(jobs.size,1,'onShow must replace, not stack, focus work');
  while(jobs.size){const first=[...jobs.entries()][0];jobs.delete(first[0]);first[1]();}
  assert(rotations.includes(true),'crown focused without prior touch');
  p.touchStart({globalX:300,globalY:300,timestamp:1});
  for(let i=0;i<100;i++)p.touchMove({globalX:299-i,globalY:299-i/2,timestamp:2+i});
  p.touchEnd({globalX:200,globalY:250,timestamp:200});p.onHide();
  assert.equal(jobs.size,0);assert(rotations.includes(false));
  assert.equal(appGlobal.tableLeft,p.imageLeft);assert.equal(appGlobal.tableTop,p.imageTop);
  const src=fs.readFileSync(path.join(MAIN,'pages/index/index.js'),'utf8');
  assert(!/drawTimer|renderTimer|scheduleCanvas|fillText/.test(src));
  p.onDestroy();assert.equal(jobs.size,0);
});
console.log(JSON.stringify({passed:ok,failed:bad}));
if(bad) process.exitCode=1;
