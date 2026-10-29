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

from PIL import Image, ImageChops, ImageStat

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


def drag(name, x1, y1, x2, y2, steps=4):
    seq = [(name + ".press", c.mouse("MousePress", x1, y1, 0))]
    for i in range(1, steps + 1):
        x = round(x1 + (x2 - x1) * i / steps)
        y = round(y1 + (y2 - y1) * i / steps)
        seq.append((name + ".move" + str(i - 1), {
            "version": "1.0.0", "command": "MouseMove", "type": "action",
            "args": {"x": x, "y": y, "button": 0}
        }))
    seq.append((name + ".release", c.mouse("MouseRelease", x2, y2, 0)))
    return seq


def pause(name, seconds):
    return [(name, {"__periodic_pause__": seconds})]


CARD_COLORS = ((112,67,63),(107,81,54),(45,82,112),(63,89,99),
               (75,83,111),(49,89,93),(90,73,111),(54,85,117),
               (94,76,60),(85,67,97))


def near_card(pixel):
    return any(max(abs(pixel[i]-target[i]) for i in range(3)) <= 24
               for target in CARD_COLORS)


def mean_diff(first, second, box):
    diff = ImageChops.difference(first.crop(box), second.crop(box))
    return sum(ImageStat.Stat(diff).mean) / 3.0


def visual_evidence(result):
    w,h=result.get("size",[412,484]);margin=max(8,round(w*0.032))
    viewport_w=((w-margin*2)//6)*6;margin=(w-viewport_w)//2
    header_h=int(h*0.12);safe_bottom=max(20,round(h*0.06));viewport_h=h-header_h-safe_bottom
    viewport=(margin,header_h,margin+viewport_w,header_h+viewport_h)
    header=(0,0,w,header_h)
    pre=result.get("frames",[]) if isinstance(result.get("frames"),list) else []
    nav=result.get("interaction",{}).get("nav_frames",[])
    def load(name):
        path=os.path.join(c.FRAMES,name)
        return Image.open(path).convert("RGB") if os.path.exists(path) else None
    pre_images=[load(name) for name in pre];pre_images=[im for im in pre_images if im is not None]
    nav_images=[load(name) for name in nav];nav_images=[im for im in nav_images if im is not None]
    if not pre_images:
        return {"ok":False,"reason":"no pre-interaction frame","cold_cards":0,"cold_text":0,
                "outside_cards":0,"pan_shift":False,"unique_viewports":0}
    def metrics(im):
        cards=text=outside=0;pixels=im.load()
        for y in range(h):
            for x in range(w):
                pixel=pixels[x,y]
                inside=viewport[0]<=x<viewport[2] and viewport[1]<=y<viewport[3]
                if near_card(pixel):
                    if inside:cards+=1
                    else:outside+=1
                if inside and min(pixel)>170:text+=1
        return cards,text,outside
    scored=[(metrics(im),im) for im in pre_images]
    (cold_cards,cold_text,outside_cards),cold=max(scored,key=lambda item:item[0][0]+item[0][1]*2)
    hashes=set();pan_shift=False;best_viewport_diff=0.0;best_header_diff=999.0
    for im in nav_images:
        sample=im.crop(viewport).convert("L").resize((32,32))
        hashes.add(sample.tobytes())
        hd=mean_diff(cold,im,header);vd=mean_diff(cold,im,viewport)
        if hd<3.0 and vd>best_viewport_diff:
            best_viewport_diff=vd;best_header_diff=hd
        if hd<3.0 and vd>5.0:pan_shift=True
    ok=(cold_cards>1500 and cold_text>250 and outside_cards<100 and pan_shift and len(hashes)>=2)
    return {"ok":ok,"cold_cards":cold_cards,"cold_text":cold_text,
            "outside_cards":outside_cards,"pan_shift":pan_shift,
            "unique_viewports":len(hashes),"best_viewport_diff":round(best_viewport_diff,2),
            "best_header_diff":round(best_header_diff,2),"viewport":list(viewport)}


def functional_sequence(w, h):
    # App computes layout from @system.device. These coordinates target the
    # resulting FIT3 viewport while retaining a non-tile partial first drag.
    seq = []
    seq += pause("wait.cold", 0.80)
    seq += drag("pan.partial", 342, 220, 231, 220)
    seq += pause("wait.partial", 0.20)
    for i in range(3):
        seq += drag("pan.to.right" + str(i + 1), 342, 220, 74, 220)
        seq += pause("wait.right" + str(i + 1), 0.20)
    # At left=-768, Cl (row=2,col=16) is centered near (302,238).
    seq += click("select.cl", 302, 238)
    seq += pause("wait.detail", 1.20)
    for i in range(3):
        seq.append(("detail.crown" + str(i + 1), {
            "version": "1.0.0", "command": "CrownRotate", "type": "action",
            "args": {"rotate": -24}
        }))
        seq += pause("wait.crown" + str(i + 1), 0.25)
    return seq


def stress_sequence(w, h):
    seq = []
    seq += pause("wait.stress.cold", 0.50)
    # Six rounds x four directions = 24 non-snapping pan completions.
    for i in range(6):
        seq += drag("stress.left" + str(i), 340, 220, 230, 220, 3)
        seq += drag("stress.up" + str(i), 206, 330, 206, 220, 3)
        seq += drag("stress.right" + str(i), 80, 220, 170, 220, 3)
        seq += drag("stress.down" + str(i), 206, 120, 206, 190, 3)
    seq.append(("stress.crown.down", {
        "version": "1.0.0", "command": "CrownRotate", "type": "action",
        "args": {"rotate": -12}
    }))
    seq += pause("wait.stress.crown.down", 0.35)
    seq.append(("stress.crown.up", {
        "version": "1.0.0", "command": "CrownRotate", "type": "action",
        "args": {"rotate": 12}
    }))
    seq += pause("wait.stress.crown.up", 0.35)
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
        args[-1] = "35000"
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
    functional["visual_evidence"] = visual_evidence(functional)
    stress["visual_evidence"] = visual_evidence(stress)
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
