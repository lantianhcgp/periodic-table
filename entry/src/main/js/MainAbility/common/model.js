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
function viewport(info) {
  if (!info || typeof info.windowWidth!=='number' || typeof info.windowHeight!=='number') return null;
  var w=info.windowWidth, h=info.windowHeight;
  if (!(w>0) || !(h>0) || !isFinite(w) || !isFinite(h)) return null;
  return {w:Math.floor(w),h:Math.floor(h)};
}
function layout(w,h) {
  var margin=Math.max(8,Math.round(w*0.032));
  var available=w-margin*2;
  var viewportW=Math.floor(available/6)*6;
  var tileW=viewportW/6;
  var tileH=Math.round(tileW*72/64);
  var headerH=Math.floor(h*0.12);
  var safeBottom=Math.max(20,Math.round(h*0.06));
  var viewportH=h-headerH-safeBottom;
  var font=Math.max(14,Math.round(w*0.045));
  var footerH=Math.floor(h*0.10),detailBottom=Math.ceil(h*0.16);
  return {
    w:w,h:h,margin:Math.floor((w-viewportW)/2),headerW:Math.round(w*0.72),headerH:headerH,
    tableW:viewportW,footerW:Math.round(w*0.76),footerH:footerH,
    detailH:h-headerH-footerH-detailBottom,
    viewportW:viewportW,viewportH:viewportH,safeBottom:safeBottom,
    tileW:tileW,tileH:tileH,atlasW:tileW*18,atlasH:tileH*9,
    font:font,titleFont:Math.round(font*1.1),smallFont:Math.max(14,Math.round(font*0.84))
  };
}
function at(row,col) { return row>=0 && row<9 && col>=0 && col<18 ? GRID[row][col] : 0; }
function clampPan(left,top,l) {
  return {
    left:clamp(left,l.viewportW-l.atlasW,0),
    top:clamp(top,l.viewportH-l.atlasH,0)
  };
}
function hit(localX,localY,left,top,l) {
  var x=localX-left, y=localY-top;
  if(x<0 || y<0 || x>=l.atlasW || y>=l.atlasH)return 0;
  return at(Math.floor(y/l.tileH),Math.floor(x/l.tileW));
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
export default {viewport:viewport,layout:layout,at:at,clampPan:clampPan,hit:hit,nucleus:nucleus,wrap:wrap};
