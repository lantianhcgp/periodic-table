# 元素周期表 · 高考版（HarmonyOS Lite Wearable / 华为手表）

华为 Lite Wearable（FIT3，412×484 圆角屏）元素周期表 App。
- **表页**：118 元素标准周期表（主表 7 行 + 镧系/锕系独立 2 行），35 高考核心元素亮色标记，10 类 10 色分类，点按进详情。
- **详情页**：元素卡（符号/中英文/相对原子质量/类别）+ 电子层 + 核外电子排布 + 常见化合价 + 周期族 + 高考要点（3 条内），上/下一元素**原地翻页**（一组节点复用，不 reload，省堆）。

`bundleName = com.hcbiu.periodic`（与 focus/memo/clan 的 jvor1 证书身份区分，不覆盖现役应用）。

## 构建 / 出图

- `build.yml`：push 触发，hvigor 出 `.app`（未签名）+ 预置签名闸门（`SIGN_P12_PEM` / `PERIODIC_P7B` secret 就位后自动出签名 `.hap` + verify_sign）。
- `sim-preview.yml`：build 绿自动触发，GH macOS runner 跑华为官方 Lite 模拟器 **fit3 档**出图（driver 私仓 `lantianhcgp/deveco-sim-ci`，`CAPTURE_APPS=periodic-table`，render-only 不误触上/下翻页钮）。
- 本地无 DevEco SDK，验收一律走官方模拟器出图 + 程序化像素断言（`vision` 不可用时），不本地起模拟器（发热 + 残留）。

## 性能预案（官方模拟器实测定型）

| 问题 | 根因（实测锁定） | 修复 |
| --- | --- | --- |
| 表页 JS HEAP OOM（0 帧） | 16.5KB 预计算 162 槽字面量 + ~810 节点 | 每槽 5 子节点→1 div+1 text（~306，-62%）；数据 16.5KB→5.1KB 调色板+元素表 onInit 现场构建 |
| 表页主体全空（只有首行） | **column/row 容器无显式 height → Lite 布局塌缩** | `.grid=210px`、各 row=22px、`.hint/.legend` 定高（对照真机验证过的 elcton 套路） |
| 构建 ERROR | `border` 简写不支持数据绑定 | 剥离 border，核心元素用「背景不透明度+白点」区分 |

- 数据分片：表页常驻 5.1KB，18.5KB 全量数据详情页才 import。
- **确定性证据**：改调色板格式（rgba→hex）前后两版表页帧 **MD5 完全一致** → 颜色非根因；加容器显式 height 后帧 7461B→30266B、像素剖面 9 段全出。这是排坑顺序的教训：**先排除布局塌缩，再怀疑数据/颜色**。

## Lite 真机高频坑（踩过的，改代码前先看）

1. **每个 column/row flex 容器必须显式 height**，否则塌缩成 0（本页 .grid/.row/.hint/.legend 全定高）。
2. **HML 表达式不支持 ES6**（无箭头/模板串/解构/for-of）；`for` 循环对象数组要唯一 `tid`。
3. **CSS 不支持**：`border` 简写数据绑定（ERROR）、`position:absolute/right`、`flex:1`、`min-width`、`line-height`、`font-weight`（静默失效）。
4. **上标/特殊字符字体豆腐**：`¹²³`、`℃`、`~`、`⁺⁻`、拉丁-1 上标（U+00B9/B2/B3）等全部规范化为普通数字/ASCII（生成器 `norm_text`）。
5. 传参走 `@system.storage` 嵌套回调（`pt_z`）+ `router.replace`，不用 `$route`/`$app` 全局。

## 数据

`entry/src/main/js/MainAbility/common/elements-full.js`（118 元素全量，详情页用）
`entry/src/main/js/MainAbility/pages/index/index.js`（表页 5.1KB：调色板 + 元素表 + buildRow）
源数据 = web 预览稿 `Documents/元素周期表web预览/index.html` 的 RAW 表（高考 35 核心 + 分类 + 要点），生成器 `~/lw_build/gen_lite.py`。

## 待办

AGC 证书申请需手机浏览器 SSO（`~/hw_watch/agc-cert` 远程视界 8777）；签名字段预置在 CI，secret 就位即出签名 `.hap`。
