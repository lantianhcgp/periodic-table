"""Pure semantic verdicts for periodic-table official simulator captures."""
import re

KNOWN_SIMULATOR_WARNINGS = {
    "[acelite][error]:current state(2) is invalid when changing ready state to show state.",
    "[acelite][error]:bindedview is nullptr",
}
PAN_RE = re.compile(r"PT:pan_end left=(-?\d+(?:\.\d+)?) top=(-?\d+(?:\.\d+)?)")
CROWN_PAN_RE = re.compile(r"PT:crown_pan left=(-?\d+(?:\.\d+)?) top=(-?\d+(?:\.\d+)?)")
FUNCTIONAL_REQUIRED = [
    "PT:index_ready w=412 h=484 left=0 top=0",
    "PT:pan_end",
    "PT:pan_end",
    "PT:pan_end",
    "PT:pan_end",
    "PT:select z=17 viaApp=1",
    "PT:isotope z=17 a=35 n=18",
    "PT:detail_ready z=17 w=412 h=484 isotope=Cl-35 p=17 n=18",
    "PT:detail_focus on=1",
    "PT:detail_scroll_end z=17",
    "PT:back z=17",
    "PT:index_ready w=412 h=484 left=-768 top=0",
]
STRESS_REQUIRED = ["PT:index_ready w=412 h=484 left=0 top=0", "PT:pan_end"]


def no_runtime_errors(text):
    bad=[]
    for line in text.splitlines():
        low=line.strip().lower()
        if low in KNOWN_SIMULATOR_WARNINGS:
            continue
        if ("[acelite][error]" in low or "[console error]" in low or
                "out_of_memory" in low or "out of memory" in low or "fatal" in low):
            bad.append(line.strip())
    return bad


def known_runtime_warnings(text):
    return [line.strip() for line in text.splitlines()
            if line.strip().lower() in KNOWN_SIMULATOR_WARNINGS]


def ordered_missing(text,markers):
    cursor=0;missing=[]
    for marker in markers:
        position=text.find(marker,cursor)
        if position<0:
            missing.append(marker)
        else:
            cursor=position+len(marker)
    return missing


def failed_sends(result):
    return [x for x in result.get("interaction",{}).get("sent",[]) if "SEND_FAIL" in x]


def receipts_for(result,command):
    receipts=result.get("probe") if isinstance(result.get("probe"),list) else []
    return [x for x in receipts if x.get("cmd")==command]


def pan_values(text):
    return [(float(a),float(b)) for a,b in PAN_RE.findall(text)]


def is_subtile(value,tile=64.0):
    return abs(value/tile-round(value/tile))>0.01


def pan_verdict(text):
    pans=pan_values(text)
    lefts={round(x,2) for x,_ in pans};tops={round(y,2) for _,y in pans}
    return {
        "pans":pans,
        "continuous":any(is_subtile(x) for x,_ in pans),
        "two_axis":(len(lefts)>=5 and len(tops)>=3 and max(lefts)-min(lefts)>=64 and max(tops)-min(tops)>=24),
    }


def gate_functional(result,text):
    missing=ordered_missing(text,FUNCTIONAL_REQUIRED)
    errors=no_runtime_errors(text);send_fail=failed_sends(result)
    nav=result.get("interaction",{}).get("nav_frames",[])
    back=result.get("interaction",{}).get("back_frames",[])
    crowns=receipts_for(result,"CrownRotate")
    crown_ok=len(crowns)==3 and all(x.get("ok") is True for x in crowns)
    pan=pan_verdict(text)
    visual=result.get("visual_evidence") if isinstance(result.get("visual_evidence"),dict) else {}
    visual_ok=visual.get("ok") is True and visual.get("pan_shift") is True and visual.get("unique_viewports",0)>=2
    return {
        "ok": (result.get("verdict")=="PASS" and result.get("rc")=="alive"
               and not send_fail and not missing and not errors and crown_ok
               and len(pan["pans"])>=4 and pan["continuous"]
               and visual_ok and len(result.get("frames",[]))>=1 and len(nav)>=4 and len(back)>=1),
        "missing_or_out_of_order_markers":missing,"runtime_errors":errors[:20],
        "ignored_simulator_warnings":known_runtime_warnings(text)[:5],
        "pre_frames":len(result.get("frames",[])),"nav_frames":len(nav),"back_frames":len(back),
        "pan_receipts":len(pan["pans"]),"continuous_pan_ok":pan["continuous"],
        "visual_evidence":visual,"visual_evidence_ok":visual_ok,
        "crown_receipts":crowns,"crown_receipts_ok":crown_ok,
        "simulator_rc":result.get("rc"),"send_fail":send_fail,
    }


def gate_stress(result,text):
    missing=ordered_missing(text,STRESS_REQUIRED)
    errors=no_runtime_errors(text);send_fail=failed_sends(result)
    crowns=receipts_for(result,"CrownRotate")
    crown_ok=len(crowns)==2 and all(x.get("ok") is True for x in crowns)
    crown_pan_ok=len(CROWN_PAN_RE.findall(text))>=1
    pan=pan_verdict(text)
    nav=result.get("interaction",{}).get("nav_frames",[])
    visual=result.get("visual_evidence") if isinstance(result.get("visual_evidence"),dict) else {}
    visual_ok=visual.get("ok") is True and visual.get("pan_shift") is True and visual.get("unique_viewports",0)>=4
    return {
        "ok": (result.get("verdict")=="PASS" and result.get("rc")=="alive"
               and not send_fail and not errors and not missing and crown_ok and crown_pan_ok
               and len(pan["pans"])>=20 and pan["continuous"] and pan["two_axis"]
               and visual_ok and len(nav)>=8),
        "runtime_errors":errors[:20],"ignored_simulator_warnings":known_runtime_warnings(text)[:5],
        "missing_or_out_of_order_markers":missing,
        "pan_gestures_expected":20,"pan_receipts":len(pan["pans"]),
        "continuous_pan_ok":pan["continuous"],"two_axis_pan_ok":pan["two_axis"],
        "visual_evidence":visual,"visual_evidence_ok":visual_ok,
        "crown_pan_ok":crown_pan_ok,"crown_receipts":crowns,"crown_receipts_ok":crown_ok,
        "simulator_rc":result.get("rc"),"send_fail":send_fail,
    }
