#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('semantic_gates',ROOT/'qa/semantic_gates.py')
if spec is None or spec.loader is None:raise RuntimeError('cannot load semantic gates')
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)


def functional_result():
    return {'verdict':'PASS','rc':'alive','frames':['cold.jpg'],
            'visual_evidence':{'ok':True,'cold_cards':5000,'cold_text':900,'outside_cards':0,'pan_shift':True,'unique_viewports':5},
            'probe':[{'cmd':'CrownRotate','ok':True} for _ in range(3)],
            'interaction':{'nav_frames':['n'+str(i) for i in range(8)],'back_frames':['b1'],'sent':['ok']}}


def stress_result():
    return {'verdict':'PASS','rc':'alive',
            'visual_evidence':{'ok':True,'cold_cards':5000,'cold_text':900,'outside_cards':0,'pan_shift':True,'unique_viewports':12},
            'probe':[{'cmd':'CrownRotate','ok':True} for _ in range(2)],
            'interaction':{'nav_frames':['n'+str(i) for i in range(24)],'sent':['ok']}}


def functional_log():
    return '\n'.join([
        'PT:index_ready w=412 h=484 left=0 top=0',
        'PT:pan_end left=-111 top=0',
        'PT:pan_end left=-377 top=0',
        'PT:pan_end left=-643 top=0',
        'PT:pan_end left=-768 top=0',
        'PT:select z=17 viaApp=1',
        'PT:isotope z=17 a=35 n=18',
        'PT:detail_ready z=17 w=412 h=484 isotope=Cl-35 p=17 n=18',
        'PT:detail_focus on=1',
        'PT:detail_scroll_end z=17',
        'PT:back z=17',
        'PT:index_ready w=412 h=484 left=-768 top=0',
    ])


def stress_log():
    lines=['PT:index_ready w=412 h=484 left=0 top=0']
    for i in range(24):
        left=-((i*37)%769);top=-((i*23)%165)
        lines.append('PT:pan_end left=%s top=%s'%(left,top))
    lines += ['PT:crown_pan left=-111 top=-48','PT:crown_pan left=-111 top=-24']
    return '\n'.join(lines)


class SemanticGateTest(unittest.TestCase):
    def test_workflow_preserves_gate_exit_code_through_tee(self):
        workflow=(ROOT/'.github/workflows/sim-preview.yml').read_text()
        self.assertIn('set -o pipefail',workflow)
        self.assertIn('official_capture.py 2>&1 | tee spawn.txt',workflow)

    def test_functional_requires_cold_start_continuous_pan_detail_and_return(self):
        text=functional_log()
        verdict=g.gate_functional(functional_result(),text)
        self.assertTrue(verdict['ok'],verdict)
        self.assertTrue(verdict['continuous_pan_ok'])
        self.assertGreaterEqual(verdict['pan_receipts'],4)
        known=text+'\n[ACELite][ERROR]:current state(2) is invalid when changing ready state to show state.'
        self.assertTrue(g.gate_functional(functional_result(),known)['ok'])
        self.assertFalse(g.gate_functional(functional_result(),known+' FATAL out of memory')['ok'])
        paged=text.replace('left=-111','left=-128').replace('left=-377','left=-384').replace('left=-643','left=-640')
        self.assertFalse(g.gate_functional(functional_result(),paged)['ok'])
        missing=text.replace('PT:index_ready w=412 h=484 left=0 top=0\n','',1)
        self.assertFalse(g.gate_functional(functional_result(),missing)['ok'])
        bad=functional_result();bad['probe'][1]['ok']=False
        self.assertFalse(g.gate_functional(bad,text)['ok'])
        blank=functional_result();blank['visual_evidence']={'ok':False,'cold_cards':0,'cold_text':0,'outside_cards':0,'pan_shift':False,'unique_viewports':1}
        self.assertFalse(g.gate_functional(blank,text)['ok'])

    def test_stress_requires_many_two_axis_subtile_drags_and_crown(self):
        text=stress_log();verdict=g.gate_stress(stress_result(),text)
        self.assertTrue(verdict['ok'],verdict)
        self.assertGreaterEqual(verdict['pan_receipts'],20)
        self.assertTrue(verdict['two_axis_pan_ok'])
        self.assertTrue(verdict['continuous_pan_ok'])
        few='\n'.join(text.splitlines()[:8]+text.splitlines()[-2:])
        self.assertFalse(g.gate_stress(stress_result(),few)['ok'])
        horizontal='\n'.join(line.replace(' top=-',' top=0 #') for line in text.splitlines())
        self.assertFalse(g.gate_stress(stress_result(),horizontal)['ok'])
        no_crown=text.replace('PT:crown_pan','PT:ignored')
        self.assertFalse(g.gate_stress(stress_result(),no_crown)['ok'])
        static=stress_result();static['visual_evidence']['pan_shift']=False;static['visual_evidence']['unique_viewports']=1
        self.assertFalse(g.gate_stress(static,text)['ok'])
        self.assertFalse(g.gate_stress(stress_result(),text+'\n[Console Error] crash')['ok'])


if __name__=='__main__':unittest.main()
