"""Pure semantic verdicts for periodic-table official simulator captures."""

KNOWN_SIMULATOR_WARNINGS = {
    "[acelite][error]:current state(2) is invalid when changing ready state to show state.",
    "[acelite][error]:bindedview is nullptr",
}

FUNCTIONAL_REQUIRED = [
    "PT:index_ready w=412 h=484 zoom=1 col=0 cols=6",
    "PT:canvas_draw zoom=1 col=0 rows=9",
    "PT:zoom value=2 cols=3",
    "PT:canvas_draw zoom=2 col=0 rows=9",
    "PT:scroll_end zoom=2 col=0",
    "PT:zoom value=3 cols=2",
    "PT:canvas_draw zoom=3 col=0 rows=9",
    "PT:scroll_end zoom=3 col=0",
    "PT:reset",
    "PT:canvas_draw zoom=1 col=0 rows=9",
    "PT:swipe direction=left col=5 zoom=1",
    "PT:canvas_draw zoom=1 col=5 rows=9",
    "PT:swipe direction=left col=10 zoom=1",
    "PT:canvas_draw zoom=1 col=10 rows=9",
    "PT:swipe direction=left col=12 zoom=1",
    "PT:canvas_draw zoom=1 col=12 rows=9",
    "PT:tap row=2 slot=4 z=17",
    "PT:select z=17 viaApp=1",
    "PT:isotope z=17 a=35 n=18",
    "PT:detail_ready z=17 w=412 h=484 isotope=Cl-35 p=17 n=18",
    "PT:detail_focus on=1",
    "PT:detail_scroll_end z=17",
    "PT:back z=17",
    "PT:index_ready w=412 h=484 zoom=1 col=12 cols=6",
    "PT:canvas_draw zoom=1 col=12 rows=9",
]

STRESS_REQUIRED = []
for _cycle in range(10):
    STRESS_REQUIRED += [
        "PT:zoom value=2 cols=3",
        "PT:canvas_draw zoom=2 col=0 rows=9",
        "PT:zoom value=1 cols=6",
        "PT:canvas_draw zoom=1 col=0 rows=9",
    ]
STRESS_REQUIRED += [
    "PT:swipe direction=left col=5 zoom=1",
    "PT:canvas_draw zoom=1 col=5 rows=9",
    "PT:swipe direction=left col=10 zoom=1",
    "PT:canvas_draw zoom=1 col=10 rows=9",
    "PT:swipe direction=left col=12 zoom=1",
    "PT:canvas_draw zoom=1 col=12 rows=9",
    "PT:scroll_end zoom=1 col=12",
]


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


def gate_functional(result,text):
    missing=ordered_missing(text,FUNCTIONAL_REQUIRED)
    errors=no_runtime_errors(text)
    nav=result.get("interaction",{}).get("nav_frames",[])
    back=result.get("interaction",{}).get("back_frames",[])
    send_fail=failed_sends(result)
    crowns=receipts_for(result,"CrownRotate")
    crown_ok=len(crowns)==5 and all(x.get("ok") is True for x in crowns)
    return {
        "ok": (result.get("verdict")=="PASS" and result.get("rc")=="alive"
               and not send_fail and not missing and not errors and crown_ok
               and len(nav)>=4 and len(back)>=1),
        "missing_or_out_of_order_markers":missing,"runtime_errors":errors[:20],
        "ignored_simulator_warnings":known_runtime_warnings(text)[:5],
        "pre_frames":len(result.get("frames",[])),"nav_frames":len(nav),"back_frames":len(back),
        "crown_receipts":crowns,"crown_receipts_ok":crown_ok,
        "simulator_rc":result.get("rc"),"send_fail":send_fail,
    }


def gate_stress(result,text):
    errors=no_runtime_errors(text)
    missing=ordered_missing(text,STRESS_REQUIRED)
    send_fail=failed_sends(result)
    crowns=receipts_for(result,"CrownRotate")
    crown_ok=len(crowns)==11 and all(x.get("ok") is True for x in crowns)
    return {
        "ok": (result.get("verdict")=="PASS" and result.get("rc")=="alive"
               and not send_fail and not errors and not missing and crown_ok),
        "runtime_errors":errors[:20],"ignored_simulator_warnings":known_runtime_warnings(text)[:5],
        "missing_or_out_of_order_markers":missing,
        "zoom_cycles_expected":10,"crown_receipts":crowns,"crown_receipts_ok":crown_ok,
        "simulator_rc":result.get("rc"),"send_fail":send_fail,
    }
