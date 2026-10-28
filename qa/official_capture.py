#!/usr/bin/env python3
"""Project-specific official Huawei Lite Simulator interaction gate.
Runs only against the built artifact unpacked by deveco-sim-ci. Unlike the generic
smoke driver, this fails CI unless semantic console markers prove the exact state
transitions requested by the product.
"""
import json
import os
import shutil
import sys
import time

import importlib.util
QA_ROOT = os.path.dirname(os.path.abspath(__file__))
if QA_ROOT not in sys.path:
    sys.path.insert(0, QA_ROOT)
from semantic_gates import gate_functional, gate_stress

SIM_ROOT = os.getcwd()
spec = importlib.util.spec_from_file_location("periodic_sim_capture", os.path.join(SIM_ROOT, "capture.py"))
if spec is None or spec.loader is None:
    raise SystemExit("capture.py not found in " + SIM_ROOT)
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)  # type: ignore[union-attr]

APP = "periodic-table"
STRESS = "periodic-stress"


def click(name, x, y):
    return [(name + ".press", c.mouse("MousePress", x, y, 0)),
            (name + ".release", c.mouse("MouseRelease", x, y, 0))]


def drag_left(name, y=200):
    seq = [(name + ".press", c.mouse("MousePress", 342, y, 0))]
    for i, x in enumerate((290, 230, 170, 110)):
        seq.append((name + ".move" + str(i), {
            "version": "1.0.0", "command": "MouseMove", "type": "action",
            "args": {"x": x, "y": y, "button": 0}
        }))
    seq.append((name + ".release", c.mouse("MouseRelease", 74, y, 0)))
    return seq


def pause(name, seconds):
    return [(name, {"__periodic_pause__": seconds})]


def functional_sequence(w, h):
    # FIT3 layout is calculated by app from @system.device, not hard-coded in app.
    # Here test coordinates target the calculated controls for this official profile.
    footer_y = int(h * 0.79)
    plus_x = int(w * 0.755)
    reset_x = w // 2
    seq = []
    seq += click("zoom2", plus_x, footer_y)
    seq += pause("wait.zoom2", 0.35)
    seq += click("zoom3", plus_x, footer_y)
    seq += pause("wait.zoom3", 0.35)
    seq += click("reset", reset_x, footer_y)
    seq += pause("wait.reset", 0.35)
    for i in range(3):
        seq += drag_left("swipe" + str(i + 1))
        seq += pause("wait.swipe" + str(i + 1), 0.35)
    # At colStart=12, Cl is row 3 (zero-based 2), visible column 5 (zero-based 4).
    seq += click("select.cl", 302, 242)
    seq += pause("wait.detail", 1.20)
    for i in range(3):
        seq.append(("detail.crown" + str(i + 1), {
            "version": "1.0.0", "command": "CrownRotate", "type": "action",
            "args": {"rotate": -24}
        }))
        seq += pause("wait.crown" + str(i + 1), 0.25)
    return seq


def stress_sequence(w, h):
    footer_y = int(h * 0.79)
    plus_x = int(w * 0.755)
    minus_x = int(w * 0.245)
    seq = []
    # 10 full zoom-in/out cycles = 40 press/release commands. The UI must remain alive.
    for i in range(10):
        seq += click("stress.plus" + str(i), plus_x, footer_y)
        seq += click("stress.minus" + str(i), minus_x, footer_y)
    for i in range(4):
        seq += drag_left("stress.left" + str(i), 190)
    seq.append(("stress.crown.down", {
        "version": "1.0.0", "command": "CrownRotate", "type": "action",
        "args": {"rotate": -12}
    }))
    seq.append(("stress.crown.up", {
        "version": "1.0.0", "command": "CrownRotate", "type": "action",
        "args": {"rotate": 12}
    }))
    return seq


_orig_send = c.send_json
_orig_popen = c.subprocess.Popen


def send_json(conns, obj):
    if isinstance(obj, dict) and "__periodic_pause__" in obj:
        time.sleep(float(obj["__periodic_pause__"]))
        return True
    return _orig_send(conns, obj)


def popen(args, *a, **kw):
    # Generic driver records for 8 s; this semantic sequence intentionally needs longer.
    if isinstance(args, list) and len(args) >= 4 and args[0] == "node" and args[1] == "ws_client.js":
        args = list(args)
        args[-1] = "20000"
    return _orig_popen(args, *a, **kw)


setattr(c, "send_json", send_json)
c.subprocess.Popen = popen


def interactions(w, h, app="", page=""):
    if app == APP:
        return functional_sequence(w, h)
    if app == STRESS:
        return stress_sequence(w, h)
    return []


def back_click(w, h, app=""):
    if app != APP:
        return []
    return click("detail.back", w // 2, int(h * 0.79))


setattr(c, "interactions_for", interactions)
setattr(c, "back_click", back_click)


def read_log(app):
    p = os.path.join(c.FRAMES, app + "__index.engine.log")
    return open(p, encoding="utf-8", errors="replace").read() if os.path.exists(p) else ""


def main():
    src = os.path.join(SIM_ROOT, "apps", APP)
    dst = os.path.join(SIM_ROOT, "apps", STRESS)
    if not os.path.isdir(src):
        raise SystemExit("built app missing: " + src)
    shutil.rmtree(dst, ignore_errors=True)
    shutil.copytree(src, dst)

    functional = c.run_one(0, APP, "pages/index/index", "fit3")
    stress = c.run_one(1, STRESS, "pages/index/index", "fit3")
    flog, slog = read_log(APP), read_log(STRESS)
    report = {
        "driver": "periodic-official-gate-v1",
        "heap_bytes": 524288,
        "functional": gate_functional(functional, flog),
        "stress": gate_stress(stress, slog),
        "raw": [functional, stress],
    }
    report["ok"] = report["functional"]["ok"] and report["stress"]["ok"]
    out = os.path.join(SIM_ROOT, "periodic-official-results.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(json.dumps({
        "ok": report["ok"],
        "functional": report["functional"],
        "stress": report["stress"],
        "results": out,
    }, ensure_ascii=False, indent=2))
    if not report["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
