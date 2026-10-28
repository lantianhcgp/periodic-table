#!/usr/bin/env python3
import importlib.util
import io
import json
import struct
import tempfile
import unittest
import zipfile
from pathlib import Path, PurePosixPath

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('audit_built_app',ROOT/'scripts/audit_built_app.py')
if spec is None or spec.loader is None:raise RuntimeError('cannot load audit module')
audit_mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit_mod)


def payload_entries(oversized=False,tiles=False,version_name='1.1.0'):
    entries={
        'config.json':json.dumps({'app':{'bundleName':'periodic.nexus.qu84q','version':{'code':1001000,'name':version_name}}}).encode(),
        'assets/js/MainAbility/app.js':b'a'*(49153 if oversized else 100),
        'assets/js/MainAbility/pages/index/index.js':b'i'*200,
        'assets/js/MainAbility/pages/detail/detail.js':b'd'*300,
        'assets/entry/resources/base/media/icon.png.bin':b'x'*20,
        'assets/entry/resources/base/media/icon_small.png.bin':b'y'*10,
    }
    if tiles:entries['assets/js/MainAbility/common/tiles/a/1.png.bin']=b'z'
    return entries


def zip_bytes(entries):
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w') as z:
        for name,data in entries.items():z.writestr(name,data)
    return out.getvalue()


def signed_bin(entries,bundle='periodic.nexus.qu84q'):
    parts=[b'\xbe',struct.pack('>I',len(bundle.encode())),bundle.encode()]
    for full,content in entries.items():
        p=PurePosixPath(full);name=p.name.encode();rel=('' if str(p.parent)=='.' else '/'+str(p.parent)).encode()
        parts += [struct.pack('>I',len(name)),name,struct.pack('>I',len(rel)),rel,struct.pack('>Q',len(content)),content]
    unsigned=b''.join(parts);tail=b'X'*16;head=bytearray(32);head[:16]=b'hw signed app   '
    struct.pack_into('>I',head,20,len(tail)+len(head))
    return unsigned+tail+head


def make_artifact(path,kind='app',**kw):
    entries=payload_entries(**kw)
    if kind=='app':data=zip_bytes({'entry-default-unsigned.hap':zip_bytes(entries)})
    elif kind=='hap':data=zip_bytes(entries)
    elif kind=='signed-hap':data=zip_bytes({'signed.bin':signed_bin(entries)})
    else:raise ValueError(kind)
    path.write_bytes(data)


class AuditBuiltAppTest(unittest.TestCase):
    def test_signer_preserves_source_release_version(self):
        signer=(ROOT/'tools/sign/sign-app-to-hap.js').read_text()
        self.assertNotRegex(signer,r'version\.code\s*=\s*0')
        config=json.loads((ROOT/'entry/src/main/config.json').read_text())
        self.assertEqual(config['app']['bundleName'],'periodic.nexus.qu84q')
        self.assertEqual(config['app']['version'],{'code':1001000,'name':'1.1.0'})

    def test_accepts_bounded_app_payload(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'ok.app';make_artifact(p)
            report=audit_mod.audit(p)
            self.assertEqual(report['container'],'app');self.assertEqual(report['image_bin_total'],30)

    def test_accepts_unsigned_and_signed_hap_payloads(self):
        with tempfile.TemporaryDirectory() as td:
            for kind in ('hap','signed-hap'):
                p=Path(td)/(kind+'.hap');make_artifact(p,kind)
                report=audit_mod.audit(p);self.assertEqual(report['container'],kind)

    def test_rejects_oversized_js(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'big.app';make_artifact(p,oversized=True)
            with self.assertRaises(AssertionError):audit_mod.audit(p)

    def test_rejects_element_bitmaps(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'tiles.app';make_artifact(p,tiles=True)
            with self.assertRaises(AssertionError):audit_mod.audit(p)

    def test_rejects_signed_header_identity_mismatch(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'wrong-id.hap'
            p.write_bytes(zip_bytes({'signed.bin':signed_bin(payload_entries(),'other.bundle')}))
            with self.assertRaises(AssertionError):audit_mod.audit(p)

    def test_rejects_wrong_version_name_in_signed_hap(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'bad.hap';make_artifact(p,'signed-hap',version_name='9.9.9')
            with self.assertRaises(AssertionError):audit_mod.audit(p)


if __name__=='__main__':unittest.main()
