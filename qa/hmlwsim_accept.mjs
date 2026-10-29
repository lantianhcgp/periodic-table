#!/usr/bin/env node
// Functional + repeated-input acceptance of a real .app in unmodified hmlwsim.
// Node >=22; CDP_PORT=9246 node qa/hmlwsim_accept.mjs <app-url> <output-dir> [sim-url]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { connect } from './hmlwsim_cdp.mjs';

const [appUrl, outputDir, simUrl = 'http://127.0.0.1:8876/'] = process.argv.slice(2);
if (!appUrl || !outputDir) throw new Error('Required: app URL, output directory');
const out = path.resolve(outputDir); fs.mkdirSync(out, { recursive: true });
const c = await connect();
const report = { simulator: 'kqakqakqa/hmlwsim', appUrl, started: new Date().toISOString(),
  runtime: 'Chromium/V8, NOT JerryScript', trueDeviceTested: false, heap512KBTested: false, checks: [], frames: [] };
let base;
function check(name, condition, data = {}) {
  report.checks.push({ name, ok: Boolean(condition), ...data });
  assert(condition, name + ': ' + JSON.stringify(data));
}
async function frame(name) {
  await c.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const file = path.join(out, name + '.png'); await c.screenshot(file);
  const state = await c.state(); report.frames.push({ name, file, state });
  return state;
}
async function mouse(type, x, y, extra = {}) {
  return c.send('Input.dispatchMouseEvent', { type, x: base.x + x, y: base.y + y, ...extra });
}
async function drag(x1, y1, x2, y2, steps = 10) {
  await mouse('mouseMoved', x1, y1);
  await mouse('mousePressed', x1, y1, { button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= steps; i++) {
    await mouse('mouseMoved', x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps, { button: 'left', buttons: 1 });
  }
  await mouse('mouseReleased', x2, y2, { button: 'left', buttons: 0, clickCount: 1 });
  await c.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
}
async function click(x, y) {
  await mouse('mouseMoved', x, y);
  await mouse('mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 });
  await mouse('mouseReleased', x, y, { button: 'left', buttons: 0, clickCount: 1 });
}
async function clickSelector(selector, index = 0) {
  const target = await c.evaluate(`(() => {
    const e=document.getElementById('watch-content').shadowRoot.querySelectorAll(${JSON.stringify(selector)})[${index}];
    if(!e)return null;const r=e.getBoundingClientRect();const host=document.getElementById('watch-content').getBoundingClientRect();
    return {x:r.x+r.width/2-host.x,y:r.y+r.height/2-host.y,width:r.width,height:r.height};
  })()`);
  check('click target visible ' + selector, target && target.width > 0 && target.height > 0 && target.y > 0 && target.y < 484, target || {});
  await click(target.x, target.y);
}
async function crown(deltaY = 120) {
  const r = await c.evaluate(`(() => {const r=document.getElementById('crown').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: r.x, y: r.y, deltaY, deltaX: 0 });
  await c.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
}
async function geometry() {
  return c.evaluate(`(() => {
    const root=document.getElementById('watch-content').shadowRoot;
    const ownText=e=>Array.from(e.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join('');
    const host=document.getElementById('watch-content').getBoundingClientRect();
    return Array.from(root.querySelectorAll('*')).filter(e=>e.tagName!=='STYLE').map(e=>{
      const r=e.getBoundingClientRect(),cs=getComputedStyle(e);
      return {tag:e.tagName,class:e.className,text:ownText(e),x:r.x-host.x,y:r.y-host.y,w:r.width,h:r.height,
        clientW:e.clientWidth,scrollW:e.scrollWidth,font:cs.fontSize};
    });
  })()`);
}
async function waitIndex() {
  await c.waitFor(`(() => {const p=DeviceFeaturePageNav.getCurrentPage();return p&&p.uri==='pages/index/index'&&p.data.ready;})()`);
  await c.waitFor(`(() => {const p=DeviceFeaturePageNav.getCurrentPage();const r=p.data.$refs;return r&&r.panCrown&&r.panCrown._rotationFocused;})()`);
}
async function tapCl() {
  const s = await c.state();
  const x = s.margin + s.left + 16.5 * s.tileW;
  const y = s.headerH + s.top + 2.5 * s.tileH;
  await c.waitFor(`Date.now()>=DeviceFeaturePageNav.getCurrentPage().data.tapBlockUntil`);
  await click(x, y);
  await c.waitFor(`(() => {const p=DeviceFeaturePageNav.getCurrentPage();return p&&p.uri==='pages/detail/detail'&&p.data.ready;})()`);
  const detail = await c.state();
  check('tap Cl selects Z17 Cl35 N18', detail.z === 17 && detail.isotope === 'Cl-35' && detail.neutrons === 18, detail);
}
try {
  const initial = await c.init(simUrl, appUrl, 412, 484);
  base = await c.evaluate(`(() => {const r=document.getElementById('watch-content').getBoundingClientRect();return {x:r.x,y:r.y};})()`);
  check('cold index and real atlas loaded', initial.uri === 'pages/index/index' && initial.ready && initial.image?.loaded && initial.image.naturalW === 1152 && initial.image.naturalH === 648, initial);
  await waitIndex(); await frame('01-cold');
  await crown(); const cr = await c.state();
  check('crown before any touch pans vertically', cr.top < initial.top, { before: initial.top, after: cr.top });
  await frame('02-crown');
  await drag(330, 255, 247, 255, 8); const hp = await c.state();
  check('horizontal sub-tile pan does not navigate', hp.uri === 'pages/index/index' && hp.left < 0 && Math.abs(hp.left % hp.tileW) > .1, hp);
  await frame('03-horizontal');
  await drag(260, 335, 260, 254, 8); const vp = await c.state();
  check('vertical sub-tile pan does not navigate', vp.uri === 'pages/index/index' && vp.top < hp.top && Math.abs(vp.top % vp.tileH) > .1, vp);
  await frame('04-vertical');
  for (let i = 0; i < 4; i++) await drag(346, 264, 66, 264, 10);
  const edge = await c.state();
  check('right edge clamp', edge.left === edge.viewportW - edge.atlasW, edge);
  await frame('05-right');
  await tapCl(); await frame('06-cl35');
  report.detailGeometryTop = await geometry();
  await drag(220, 324, 220, 110, 12);
  await frame('07-nucleus');
  await clickSelector('.iso', 1);
  await c.waitFor(`DeviceFeaturePageNav.getCurrentPage().data.isoLabel==='Cl-37'`);
  const isotope = await c.state(); check('Cl37 has N20', isotope.neutrons === 20, isotope);
  await frame('08-cl37');
  report.detailGeometryNucleus = await geometry();
  for (let i = 0; i < 5; i++) { await drag(220, 328, 220, 108, 12); await frame('09-detail-' + i); }
  await clickSelector('.backbtn'); await waitIndex();
  const returned = await c.state();
  check('return restores pan offsets', returned.left === edge.left && returned.top === edge.top, returned);
  await frame('10-return');
  const beforeBackCrown = returned.top; await crown();
  check('crown focus restored after return', (await c.state()).top < beforeBackCrown);
  // Endpoint visibility: all labels 113..118 should remain fully reachable.
  for (let i = 0; i < 3; i++) await drag(250, 335, 250, 105, 12);
  const bottom = await c.state(); check('bottom clamp', bottom.top === bottom.viewportH - bottom.atlasH, bottom);
  await frame('11-bottom-right');
  // Real pointer drags and route cycles. This is functional repetition, not heap validation.
  const started = Date.now();
  for (let i = 0; i < 20; i++) {
    await drag(110, 180, 158, 227, 4); await drag(260, 310, 212, 263, 4);
    const s = await c.state();
    check('repeat pan bounded ' + i, s.uri === 'pages/index/index' && s.left <= 0 && s.left >= s.viewportW-s.atlasW && s.top <= 0 && s.top >= s.viewportH-s.atlasH, { left:s.left,top:s.top });
  }
  report.repeatPanDurationMs = Date.now() - started;
  await frame('12-repeat-pan');
  for (let i = 0; i < 3; i++) await drag(200, 125, 200, 330, 10);
  for (let i = 0; i < 2; i++) await drag(340, 240, 60, 240, 10);
  for (let i = 0; i < 10; i++) {
    await tapCl(); await clickSelector('.backbtn'); await waitIndex();
  }
  await frame('13-repeat-routes');
  report.errors = await c.evaluate('window.__qaErrors');
  report.logs = await c.evaluate('window.__qaLogs');
  check('no JavaScript errors', report.errors.length === 0, { errors: report.errors });
  report.verdict = 'PASS';
} catch (error) {
  report.verdict = 'FAIL'; report.error = error.stack || String(error);
  try { await frame('failure'); report.errors = await c.evaluate('window.__qaErrors'); report.logs = await c.evaluate('window.__qaLogs'); } catch (captureError) { report.captureError=String(captureError); }
  process.exitCode = 1;
} finally {
  report.finished = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'hmlwsim-report.json'), JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({ verdict:report.verdict,checks:report.checks.length,failed:report.checks.filter(x=>!x.ok),error:report.error,report:path.join(out,'hmlwsim-report.json') },null,2));
  c.close();
}
