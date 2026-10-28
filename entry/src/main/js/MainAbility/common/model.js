// Pure UI/domain rules. No device defaults, data objects or framework dependencies.
var GRID = [
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [3,4,0,0,0,0,0,0,0,0,0,0,5,6,7,8,9,10],
  [11,12,0,0,0,0,0,0,0,0,0,0,13,14,15,16,17,18],
  [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],
  [37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54],
  [55,56,-1,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86],
  [87,88,-2,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118],
  [0,0,0,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71],
  [0,0,0,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103]
];
function clamp(n,a,b) { return Math.max(a,Math.min(b,n)); }
function level(z) { return z===2 || z===3 ? z : 1; }
function viewport(info) {
  if (!info || typeof info.windowWidth!=='number' || typeof info.windowHeight!=='number') return null;
  var w=info.windowWidth, h=info.windowHeight;
  if (!(w>0) || !(h>0) || !isFinite(w) || !isFinite(h)) return null;
  return {w:Math.floor(w),h:Math.floor(h)};
}
function layout(w,h,z) {
  z=level(z);
  var margin=Math.round(w*0.035), tableW=w-2*margin;
  var headerH=Math.floor(h*0.13), hintH=Math.floor(h*0.055);
  var footerH=Math.floor(h*0.10), bottomH=Math.ceil(h*0.16);
  var footerW=Math.round(w*0.76), btnGap=Math.round(w*0.012);
  var font=Math.max(14,Math.round(w*0.045));
  return {
    w:w,h:h,margin:margin,tableW:tableW,headerW:Math.round(w*0.72),
    cols:6/z,tileW:tableW/6*z,tileH:Math.round(tableW/6*z*128/114),
    headerH:headerH,hintH:hintH,footerH:footerH,bottomH:bottomH,
    listH:h-headerH-hintH-footerH-bottomH,
    detailH:h-headerH-footerH-bottomH,footerBottom:h-bottomH,
    footerW:footerW,btnGap:btnGap,btnW:Math.floor((footerW-btnGap*6)/3),
    font:font,titleFont:Math.round(font*1.1),smallFont:Math.max(14,Math.round(font*0.84))
  };
}
function at(row,col) { return row>=0 && row<9 && col>=0 && col<18 ? GRID[row][col] : 0; }
function columns(zoom) { return 6/level(zoom); }
function cell(row,slot,start,zoom) {
  var cols=columns(zoom);
  if(slot<0 || slot>=cols || Math.floor(slot)!==slot)return 0;
  start=clamp(Math.round(start),0,18-cols);
  return at(row,start+slot);
}
function shift(start,zoom,direction) {
  zoom=level(zoom); var cols=6/zoom;
  var step=Math.max(1,cols-1);
  if(direction==='left') start+=step;
  else if(direction==='right') start-=step;
  return clamp(start,0,18-cols);
}
function nucleus(z,a) {
  if(typeof z!=='number' || typeof a!=='number' || !isFinite(z) || !isFinite(a) || z<1 || z>118 || Math.floor(z)!==z || a<z || Math.floor(a)!==a) return null;
  return {protons:z,massNumber:a,neutrons:a-z};
}
function wrap(text,columns) {
  text=String(text||''); var out='', line='', used=0;
  for(var i=0;i<text.length;i++) {
    var char=text.charAt(i), code=text.charCodeAt(i), weight=code>255?1:0.55;
    if(code>=0xD800 && code<=0xDBFF && i+1<text.length) {char+=text.charAt(++i);weight=1;}
    if(char==='\n') {out+=line+'\n';line='';used=0;continue;}
    if(used+weight>columns && line) {out+=line+'\n';line='';used=0;}
    line+=char;used+=weight;
  }
  return out+line;
}
export default {viewport:viewport,layout:layout,at:at,cell:cell,columns:columns,shift:shift,nucleus:nucleus,wrap:wrap};
