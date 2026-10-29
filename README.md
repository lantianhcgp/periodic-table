# 元素周期表 · 高考版

面向华为 HarmonyOS Lite Wearable 的 118 元素周期表应用，目标设备为 WATCH FIT 3。`bundleName = periodic.nexus.qu84q`。

## 功能

- 118 个元素：原子序数、符号、官方中文名与分类配色。
- 单张完整图集、固定倍率，手指连续横纵平移；无缩放和分页按钮，表冠控制纵向平移。
- 镧系、锕系独立成行，点击主表对应范围卡可向下定位。
- 点选元素进入详情；返回恢复此前浏览位置。拖动、长按与取消触摸不作为元素点选。
- 详情采用独立滚动卡片：中英文名称、分类、质子数、中性原子电子数、最外层电子数、分层电子数、基态电子排布、相对原子质量或代表核素质量数、周期与族、常见氧化态、电负性、第一电离能和高考关联。
- 核素信息区分“质量数”和“相对原子质量”。中子数仅针对选定核素按 `N=A−Z` 计算；氢、碳、氯、铜、溴提供多个核素切换示例。

## 自适应布局

- 根容器使用 `width:100%; height:100%`。
- 内部尺寸来自 `@system.device.getInfo()` 的实际 `windowWidth/windowHeight`，由 `common/model.js` 统一计算；无有效窗口信息时显示重试，不使用固定设备分辨率兜底。
- 412×484 仅是 FIT3 的测试输入，不是应用布局常量；本地几何测试另覆盖 336×396、454×454、466×466、280×456，不因此宣称这些设备已通过真机测试。
- 首页采用一个 `stack + image` 视口和不可见表冠输入代理；标题不跟随内容移动。
- 图集文字离线绘制，避免表端 Canvas 字体对稀有中文元素名的支持差异。源图为 1152×648，按实际窗口计算显示尺寸。

## 数据与生成

- 周期表基础属性：PubChem PUG REST `periodictable/JSON`。
- 核素质量数与天然丰度：NIST Atomic Weights and Isotopic Compositions。
- 中文名称：中国化学会中文版周期表，104–118 号稀有字另有代码点断言。
- 学习范围：教育部《普通高中化学课程标准（2017 年版 2020 年修订）》及应用内高考关联说明。
- 最小人工元数据：`tools/elements-seed.json`；来源快照及哈希：`tools/source_manifest.json`。

```sh
python tools/build_catalog.py --font tools/NotoSansCJKsc-Regular.otf
python tools/generate_table_atlas.py
# 只更新源图/像素校验清单，不重画图集：
python tools/generate_table_atlas.py --manifest-only
```

目录生成器锁定 Pillow 12.3.0 和字体 SHA-256，并检查 OpenType cmap 覆盖中文元素名。字体不进入安装包。`tools/atlas_manifest.json` 仅用于主机构建审计，不放入表端常驻数据。

## 本地测试

```sh
node tests/redo.test.cjs
python -B tests/audit_built_app.test.py -v
python -B tests/semantic_gates.test.py -v
```

覆盖 118 元素完整性、电子层总数、核素计算、多窗口首页/详情布局、连续平移、点按/拖动互斥、返回状态、焦点定时器清理，以及真实产物审计器的异常输入。

## hmlwsim 验收

按用户 2026-10-29 的决定，交互和视觉验收使用朋友 kqakqakqa 的 [hmlwsim](https://kqakqakqa.github.io/hmlwsim/)，不再等待官方模拟器。

- 使用独立克隆，固定上游 commit；不修改模拟器核心运行时或交付包。
- 加载与交付 HAP 同一 CI 构建的 `.app`；签名前后逐文件载荷复核。
- 主机工具 `qa/hmlwsim_cdp.mjs` 连接本地 Chromium CDP，执行真实浏览器输入、收集页面状态和截图。
- 验收路径：冷启动 → 表冠 → 连续横纵拖动 → Cl 详情 → Cl-35/Cl-37 切换 → 返回恢复 → 连续操作；截图逐组件复看并辅以像素断言。
- `sim-preview.yml` 官方脚本保留；GitHub 官方模拟器 workflow 暂停，避免默认分支旧触发器继续排队。需要官方实测时显式恢复后手动运行。`qa/official_capture.py` 与其语义单测不表示本版已跑官方引擎。

hmlwsim 是浏览器运行时，不证明 JerryScript 的 512 KB 堆上限、真机图片池释放、功耗或最终触摸手感。模拟器通过与 FIT3 真机最终验收明确分开。

## 构建与签名

- `build.yml` 在 push 或手动触发时构建 `.app`，检查 app/index/detail 编译 JS 均不超过 49152 B。
- 包内图片白名单：两张启动图及一张周期表图集。图集校验固定 BIN 头、宽高、精确长度、完整 BGRA 像素 SHA-256，并验证 manifest 对应当前源码 PNG。
- 仓库内 `certs/periodic.p7b` 与 GitHub `SIGN_P12_PEM` Secret 是硬门禁，缺失即失败，不交付未签名包。
- `tools/sign/verify_sign.py` 验证最终 HAP 的 CMS 与 p7b 配对；签名器保留版本 `1.1.0 / 1001000`，不重置为 0。
- 签名后再次检查最终 HAP 的身份、版本、JS 和图像载荷，失败阻断交付。

## 资源与内存边界

- 应用级详情目录是紧凑字符串，详情页仅解析当前元素，避免在页面 `data` 复制完整对象树。
- 首页只保留偏移等标量和单张图集，不创建 118 个卡片节点，不在拖动过程中重画文字。
- 图集 BGRA 像素约 2.85 MiB，独立于 JS heap；实际图片池还可能包含引擎缩放副本，需真机确认。
- 页面隐藏/销毁时撤销表冠焦点、清除定时器、终止触摸，并释放详情对象引用。
- 尚未用本版在 FIT3 实测的运行时内存、图片释放和长期稳定性，不作已验证承诺。
