#!/usr/bin/env node
// Host-only hmlwsim CDP helper. Requires Node with native WebSocket; no npm install.
// Usage: node qa/hmlwsim_cdp.mjs init <sim-url> <app-url> [width height]
//        node qa/hmlwsim_cdp.mjs eval '<JavaScript expression>'
//        node qa/hmlwsim_cdp.mjs shot <absolute-output.png>
// CDP_PORT defaults to 9246. Never alters the loaded build artifact.
import fs from 'node:fs';
import path from 'node:path';

export async function connect(port = Number(process.env.CDP_PORT || 9246)) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error('CDP target lookup: ' + response.status);
  const target = (await response.json()).find(t => t.type === 'page');
  if (!target) throw new Error('No browser page target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CDP connect timeout')), 15000);
    ws.onopen = () => { clearTimeout(timeout); resolve(); };
    ws.onerror = () => { clearTimeout(timeout); reject(new Error('CDP socket error')); };
  });
  let nextId = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const p = pending.get(message.id); pending.delete(message.id); clearTimeout(p.timer);
      if (message.error) p.reject(new Error(JSON.stringify(message.error)));
      else p.resolve(message.result);
    } else if (message.method) {
      if (events.length < 4000) events.push(message);
    }
  };
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 30000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result?.value;
  }
  async function waitFor(expression, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate(expression)) return;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('State timeout: ' + expression);
  }
  async function screenshot(output) {
    const clip = await evaluate(`(() => { const r=document.getElementById('watch-content').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}; })()`);
    if (!(clip.width > 0 && clip.height > 0)) throw new Error('Empty watch viewport');
    const frame = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, Buffer.from(frame.data, 'base64'));
    return { output: path.resolve(output), clip };
  }
  async function state() {
    return evaluate(`(() => {
      const p=DeviceFeaturePageNav.getCurrentPage(); if(!p)return null;
      const d=p.data, root=document.getElementById('watch-content').shadowRoot;
      const image=root.querySelector('.atlas');
      return {uri:p.uri,ready:d.ready,w:d.w,h:d.h,left:d.imageLeft,top:d.imageTop,
        viewportW:d.viewportW,viewportH:d.viewportH,atlasW:d.atlasW,atlasH:d.atlasH,tileW:d.tileW,tileH:d.tileH,
        margin:d.margin,headerH:d.headerH,footerH:d.footerH,listH:d.listH,
        z:d.z,isotope:d.isoLabel,neutrons:d.neutronCount,
        refs:Object.keys(d.$refs||{}),nodeCount:root.querySelectorAll('*').length,
        image:image?{loaded:image.complete,naturalW:image.naturalWidth,naturalH:image.naturalHeight}:null};
    })()`);
  }
  async function init(simUrl, appUrl, width = 412, height = 484) {
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 720, height: 760, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: simUrl });
    await waitFor(`typeof JSZip!=='undefined' && typeof DeviceFeaturePageNav!=='undefined' && !!document.getElementById('watch-content').shadowRoot`);
    await evaluate(`(() => {
      window.__qaErrors=[];window.__qaLogs=[];
      for(const name of ['error','warn','info']){const original=console[name];console[name]=function(...args){
        const line=args.map(v=>typeof v==='string'?v:String(v)).join(' ');
        if(window.__qaLogs.length<4000)window.__qaLogs.push({level:name,line});
        if(name==='error')window.__qaErrors.push(line);original.apply(console,args);
      };}
      window.addEventListener('error',e=>window.__qaErrors.push(e.message));
      window.addEventListener('unhandledrejection',e=>window.__qaErrors.push(String(e.reason)));
      const style=document.createElement('style');style.textContent=
        '#controls,#status-bar,#drop-zone,#lib-loading-overlay{display:none!important}' +
        'html,body{margin:0;padding:0;overflow:hidden;background:#090c11}' +
        '#app,#watch-area{width:100vw;height:100vh;min-width:0;display:flex;align-items:center;justify-content:center}' +
        '#watch-shell{margin:0}#watch-frame{border:0!important;box-shadow:none!important}' +
        '#watch-frame.rect{border-radius:0!important}';
      document.head.appendChild(style);
      SensorPanel.setConfig({width:${Number(width)},height:${Number(height)},isCircle:false});
      DeviceFeatureDisplay.configure(${Number(width)},${Number(height)},false);
    })()`);
    await evaluate(`(async()=>{
      const response=await fetch(${JSON.stringify(appUrl)});if(!response.ok)throw new Error('APP HTTP '+response.status);
      const bytes=await response.arrayBuffer();
      const data=new DataTransfer();data.items.add(new File([bytes],'periodic.app',{type:'application/zip'}));
      const input=document.getElementById('file-input');input.files=data.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));return bytes.byteLength;
    })()`);
    await waitFor(`(() => {const p=DeviceFeaturePageNav.getCurrentPage();return p&&p.data&&p.data.ready;})()`, 60000);
    await waitFor(`(() => {const r=document.getElementById('watch-content').shadowRoot;return Array.from(r.querySelectorAll('img')).every(i=>i.complete&&i.naturalWidth>0);})()`);
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    return state();
  }
  return { send, evaluate, waitFor, screenshot, state, init, events, close: () => ws.close() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const client = await connect();
  try {
    const [command, ...args] = process.argv.slice(2);
    let result;
    if (command === 'init') result = await client.init(args[0], args[1], Number(args[2] || 412), Number(args[3] || 484));
    else if (command === 'eval') result = await client.evaluate(args[0]);
    else if (command === 'shot') result = await client.screenshot(args[0]);
    else if (command === 'state') result = await client.state();
    else throw new Error('Expected init/eval/shot/state');
    console.log(JSON.stringify(result, null, 2));
  } finally { client.close(); }
}
