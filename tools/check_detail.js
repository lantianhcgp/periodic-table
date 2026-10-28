// 本地跑 detail 页新逻辑：118 元素全遍历 + 抽样核验
const fs = require("fs");
const full = fs.readFileSync("/data/data/com.termux/files/home/periodic-table/entry/src/main/js/MainAbility/common/elements-full.js", "utf8");
const m = full.match(/var FULL=(\[\[.*?\]\]);/s);
eval("var FULL=" + m[1]);
function byZ(z) { var r = FULL[z - 1]; return r ? r : null; }
var bad = [];
for (var z = 1; z <= 118; z++) {
  var el = byZ(z);
  if (!el) { bad.push(z + ":MISSING"); continue; }
  var massStr = String(el[4]).replace(/[()\[\]]/g, "");
  var massNum = Math.round(parseFloat(massStr));
  if (isNaN(massNum)) massNum = 0;
  var neutrons = massNum - el[0];
  var shAll = (el[11] || "").split(",");
  var outerV = "";
  for (var t = shAll.length - 1; t >= 0; t--) { if (shAll[t]) { outerV = shAll[t]; break; } }
  if (neutrons < 0) bad.push(z + " " + el[1] + " n<0: " + neutrons + " (w=" + el[4] + ")");
  if (!outerV && el[11]) bad.push(z + " " + el[1] + " outer empty");
}
console.log("异常条数:", bad.length);
console.log(bad.slice(0, 20).join("\n"));
[8, 26, 53, 92].forEach(function (z) {
  var el = byZ(z);
  var massStr = String(el[4]).replace(/[()\[\]]/g, "");
  var m = Math.round(parseFloat(massStr));
  var sh = (el[11] || "").split(",");
  var outer = "";
  for (var t = sh.length - 1; t >= 0; t--) { if (sh[t]) { outer = sh[t]; break; } }
  console.log("z=" + z, el[1], "质子=" + z, "中子=" + (m - z), "质量数=" + m, "最外层=" + outer, "| shells=" + el[11]);
});
