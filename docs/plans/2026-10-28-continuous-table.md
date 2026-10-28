# Continuous Periodic Table Implementation Plan

> **For Hermes:** Execute task-by-task with TDD and independent pre-commit review.

**Goal:** Replace the unreliable Canvas/paged/zoom homepage with a fixed-scale, image-backed periodic table that pans continuously in both axes on Lite Wearable.

**Architecture:** Generate one reproducible 18×9 PNG atlas from the existing grid labels and bundled CJK font. Render it as one dynamically positioned `<image>` inside a clipped `<stack>` viewport; keep only scalar pan state and map taps back to grid coordinates.

**Tech Stack:** HarmonyOS Lite HML/CSS/ES5 JavaScript, Python/Pillow asset generator, Node test harness, GitHub Actions HarmonyOS build, official Lite Simulator.

---

### Task 1: Lock the new homepage contract with failing tests

**Files:**
- Modify: `tests/redo.test.cjs`

**Steps:**
1. Add assertions that index HML contains one atlas image and touch start/move/end handlers.
2. Assert index HML/JS contains no canvas, zoom controls, `colStart`, `onSwipe`, or paging shift calls.
3. Assert layout exposes atlas/viewport geometry and uses nearly all height below the header.
4. Add pan-clamp, continuous sub-tile movement, tap-vs-drag, and coordinate-to-element tests.
5. Run `node tests/redo.test.cjs`; expect failures caused by missing atlas/pan implementation.

### Task 2: Add reproducible atlas generation

**Files:**
- Create: `tools/generate_table_atlas.py`
- Create: `entry/src/main/js/MainAbility/common/periodic_table_atlas.png`
- Modify: `tests/redo.test.cjs`

**Steps:**
1. Parse `grid.js` and `model.js` sources rather than duplicating labels.
2. Render 18×9 tiles with `tools/NotoSansCJKsc-Regular.otf` at 64×72 per tile.
3. Add generator assertions for dimensions, nonempty glyph regions, and all 118 mappings.
4. Generate the PNG and run the targeted tests; atlas tests pass while homepage contract remains red.

### Task 3: Implement continuous image panning

**Files:**
- Rewrite: `entry/src/main/js/MainAbility/pages/index/index.js`
- Rewrite: `entry/src/main/js/MainAbility/pages/index/index.hml`
- Rewrite: `entry/src/main/js/MainAbility/pages/index/index.css`
- Modify: `entry/src/main/js/MainAbility/common/model.js`

**Steps:**
1. Add adaptive layout returning header, viewport, atlas dimensions, tile dimensions, and safe bottom.
2. Mount one atlas image directly; remove list/canvas/zoom/footer/hint state and timers.
3. Add ES5 touch handlers with pixel-clamped `left/top` updates and 8px tap threshold.
4. Map tap coordinates through pan offsets to `model.at(row,col)` and route to detail.
5. Run `node tests/redo.test.cjs`; all contract tests pass.

### Task 4: Update official interaction gates

**Files:**
- Modify: `qa/official_capture.py`
- Modify: `qa/semantic_gates.py`
- Modify: `tests/semantic_gates.test.py`

**Steps:**
1. Remove zoom-cycle and paged-column marker expectations.
2. Capture cold first frame, sub-tile horizontal drag, vertical drag, Cl tap after panning, detail scroll, and return.
3. Stress repeated bidirectional drags and tap suppression under 512KB.
4. Run semantic gate tests and confirm old zoom/paging logs can no longer satisfy the gate.

### Task 5: Verify and review locally

**Files:** all modified files.

**Steps:**
1. Run Node tests, Python tests/compile, PNG checks, YAML parse, and `git diff --check`.
2. Run built-payload audit tests.
3. Dispatch independent review for spec compliance, Lite syntax, gesture logic, heap/image risk, and false-green gates.
4. Fix P0–P2 findings and rerun the full local suite.
5. Commit with `[verified]` prefix and push `redo/verified`.

### Task 6: Build, simulate, and deliver

**Steps:**
1. Wait for GitHub build; require unsigned build, payload audit, signing, signature verification, and final signed audit all green.
2. Run official macOS ARM64 Simulator; visually inspect cold frame, continuous partial drag positions, detail route, return, and stress frames.
3. Download signed HAP, rerun local CMS verification, confirm bundle/version/SHA.
4. Copy to `/storage/emulated/0/haps/periodic-table-20261029-continuous-v1.1.0.hap` (date adjusted to actual build date).
5. Report simulator evidence and clearly mark true-device behavior as pending the user's morning test.
6. Patch the Huawei Lite skill with the screenshot-grounded Canvas text/startup pitfall and image-pan recipe, labelled pending true-device confirmation until the user approves.
