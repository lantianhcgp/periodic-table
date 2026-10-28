# 元素周期表 · 高考版

面向华为 HarmonyOS Lite Wearable 的 118 元素周期表应用，目标设备为 WATCH FIT 3。`bundleName = periodic.nexus.qu84q`。

## 功能

- 118 个元素：原子序数、符号、中文名与分类配色。
- 原生 `<list>` 纵向滚动并支持表冠；手指横滑浏览 18 列，不设置左右翻列按钮。
- 1× / 2× / 3× 真正内容缩放：每屏分别显示 6 / 3 / 2 列；标题与底部缩放控件保持固定尺寸。
- 元素详情采用独立滚动卡片：中英文名称、分类、质子数、中性原子电子数、最外层电子数、分层电子数、基态电子排布、相对原子质量或代表核素质量数、周期与族、常见氧化态、电负性、第一电离能和高考关联。
- 核素信息明确区分“质量数”和“相对原子质量”。中子数仅针对选定核素按 `N=A−Z` 计算；氢、碳、氯、铜、溴提供多个核素切换示例。

## 自适应布局

- 根容器使用 `width:100%; height:100%`。
- 页面内部尺寸来自 `@system.device.getInfo()` 返回的实际 `windowWidth/windowHeight`，统一由 `common/model.js` 计算；无有效窗口信息时显示重试，不使用 412×484 等伪造兜底值。
- 412×484 仅是官方模拟器的 FIT3 测试档位，不是应用布局常量。
- 首页用 9 个原生 Canvas 行动态绘制元素卡，缩放时只重建表格 Canvas；不打包逐元素位图。官方模拟器必须逐项核对稀有中文元素字形。

## 数据与生成

- 周期表基础属性：PubChem PUG REST `periodictable/JSON`。
- 核素质量数与天然丰度：NIST Atomic Weights and Isotopic Compositions。
- 中文名称：以中国化学会发布的中文版周期表为准，104–118 号稀有字另有自动化代码点断言。
- 学习范围：教育部《普通高中化学课程标准（2017 年版 2020 年修订）》以及应用内明确编写的高考关联说明。
- 最小人工元数据：`tools/elements-seed.json`；来源快照及哈希见 `tools/source_manifest.json`。
- 生成命令：

```bash
python tools/build_catalog.py --font tools/NotoSansCJKsc-Regular.otf
```

生成器锁定 Pillow 12.3.0 和字体 SHA-256 `2c76254f…0365b74b`，并直接检查 OpenType format-12 cmap 是否覆盖全部中文元素名；不接受任意替换字体。产出 `common/catalog.js`、`common/grid.js`、启动图标和 QA 总览图，不生成或打包逐元素位图。字体文件本身不进入仓库或安装包。

## 测试

```bash
node tests/redo.test.cjs
python tests/audit_built_app.test.py -v
python tests/semantic_gates.test.py -v
```

本地门禁覆盖：

- 118 元素完整性、电子层总数、中文稀有字、核素计算；
- 多档真实窗口布局、底部安全区和控件尺寸恒定；
- 1×/2×/3× 真倍率、横滑边界、定时器清理；
- 禁止平均原子质量取整推算中子数、禁止伪造窗口尺寸兜底；
- `.app → .hap` 产物审计器的 48 KB 页面门禁、图片资源白名单和身份检查。

`.github/workflows/sim-preview.yml` 在华为官方 Lite Simulator（macOS）运行项目专用语义门禁 `qa/official_capture.py`，要求引擎日志实际出现以下状态链：

1. 1× → 2× → 3×；
2. 重置后连续横滑到第 12 列；
3. 点选 Cl 并进入 Cl-35 详情，验证 `Z=17, N=18`；
4. 详情滚动与返回首页；
5. 512 KB JS heap 下严格按序完成 10 组 `1×→2×→1×` 且每次都有 Canvas 重绘，再验证横滑、表冠回执与滚动结束；
6. 任意 ACELite/Console/OOM 错误都会使 CI 非零退出。

该门禁不再以“帧发生变化”或“进程仍存活”代替功能通过。

## 构建与签名

- `build.yml`：push 或手动触发，构建 `.app`；解包真实 HAP 检查 app/index/detail 编译 JS 均 ≤49152 B、包内只有两张启动图、bundle 与版本正确；签名后对最终 `.hap` 再跑同一载荷审计。
- 仓库内 `certs/periodic.p7b` 与 `SIGN_P12_PEM` Secret 是构建硬门禁，CI 必须生成 `periodic-table.hap`；缺任一项直接失败，不允许未签名假绿。
- `tools/sign/verify_sign.py` 对最终 HAP 做 CMS 与 p7b 配对验签；签名器保留源版本 `1.1.0 / 1001000`（不再重置为 0），验签或版本载荷复审失败都会阻断交付。
- 官方模拟器 workflow 校验 build artifact 的 `headSha` 与被测试源码完全一致，并固定模拟器驱动 commit，防止取到旧包或浮动驱动。

## 资源与内存边界

- 首页常驻标签表约 2.2 KB；应用级详情目录是约 18 KB 的紧凑字符串，详情页只解析当前元素记录，避免在页面 `data` 复制 118 个对象。
- 首页固定为 9 个 `list-item + canvas` 行，不随 118 个元素增加 HML 节点；不含逐元素 PNG，避免 Lite 转换为未压缩 `.bin` 后包体膨胀。
- FIT3 档 Canvas 近似像素池：1× 0.95 MiB、2× 1.90 MiB、3× 2.85 MiB；每次重绘先销毁旧 Canvas 并合并快速连续操作。
- 页面隐藏或销毁时撤销表冠焦点、清除焦点/重建/绘制定时器、销毁 Canvas 并释放详情对象引用。
- 官方模拟器可证明 512 KB JS heap 配置下的构建、交互与短时压力测试；长期 Canvas 回收、功耗和真机触摸手感仍以 FIT3 安装验收为准。
