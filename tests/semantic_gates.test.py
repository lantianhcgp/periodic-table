#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('semantic_gates',ROOT/'qa/semantic_gates.py')
if spec is None or spec.loader is None:raise RuntimeError('cannot load semantic gates')
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)


def functional_result():
    return {'verdict':'PASS','rc':'alive','frames':['pre.jpg'],
            'probe':[{'cmd':'CrownRotate','ok':True} for _ in range(3)],
            'interaction':{'nav_frames':['n1','n2','n3','n4'],'back_frames':['b1'],'sent':['ok']}}


def stress_result():
    return {'verdict':'PASS','rc':'alive',
            'probe':[{'cmd':'CrownRotate','ok':True} for _ in range(2)],
            'interaction':{'sent':['ok']}}


class SemanticGateTest(unittest.TestCase):
    def test_workflow_preserves_gate_exit_code_through_tee(self):
        workflow=(ROOT/'.github/workflows/sim-preview.yml').read_text()
        self.assertIn('set -o pipefail',workflow)
        self.assertIn('official_capture.py 2>&1 | tee spawn.txt',workflow)

    def test_functional_requires_complete_ordered_live_run(self):
        text='\n'.join(g.FUNCTIONAL_REQUIRED)
        self.assertTrue(g.gate_functional(functional_result(),text)['ok'])
        known=text+'\n[ACELite][ERROR]:current state(2) is invalid when changing ready state to show state.'
        self.assertTrue(g.gate_functional(functional_result(),known)['ok'])
        self.assertEqual(len(g.gate_functional(functional_result(),known)['ignored_simulator_warnings']),1)
        combined=known+' FATAL out of memory'
        self.assertFalse(g.gate_functional(functional_result(),combined)['ok'])
        route_noise=text+'\n[ACELite][ERROR]:bindedView is nullptr'
        self.assertTrue(g.gate_functional(functional_result(),route_noise)['ok'])
        self.assertFalse(g.gate_functional(functional_result(),route_noise+' FATAL')['ok'])
        self.assertFalse(g.gate_functional(functional_result(),'\n'.join(reversed(g.FUNCTIONAL_REQUIRED)))['ok'])
        dead=functional_result();dead['rc']=-11
        self.assertFalse(g.gate_functional(dead,text)['ok'])
        send=functional_result();send['interaction']['sent']=['tap:SEND_FAIL']
        self.assertFalse(g.gate_functional(send,text)['ok'])
        one_crown=functional_result();one_crown['probe']=one_crown['probe'][:1]
        self.assertFalse(g.gate_functional(one_crown,text)['ok'])
        self.assertFalse(g.gate_functional(functional_result(),text.replace('PT:detail_scroll_end z=17',''))['ok'])

    def test_stress_requires_ten_ordered_cycles_redraw_swipe_scroll_and_two_crowns(self):
        text='\n'.join(g.STRESS_REQUIRED)
        self.assertTrue(g.gate_stress(stress_result(),text)['ok'])
        repeated=('PT:zoom value=2 cols=3\n'*20+'PT:canvas_draw zoom=1 col=0 rows=9\n'+
                  'PT:swipe direction=left col=5 zoom=1\nPT:swipe direction=left col=10 zoom=1\n'+
                  'PT:swipe direction=left col=12 zoom=1\nPT:scroll_end zoom=1 col=12\n')
        self.assertFalse(g.gate_stress(stress_result(),repeated)['ok'])
        one_bad=stress_result();one_bad['probe'][1]['ok']=False
        self.assertFalse(g.gate_stress(one_bad,text)['ok'])
        self.assertFalse(g.gate_stress(stress_result(),text.replace('PT:canvas_draw zoom=2 col=0 rows=9','',1))['ok'])
        self.assertFalse(g.gate_stress(stress_result(),text+'\n[Console Error] crash')['ok'])


if __name__=='__main__':unittest.main()
