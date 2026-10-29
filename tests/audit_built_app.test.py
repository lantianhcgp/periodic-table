#!/usr/bin/env python3
import hashlib
import importlib.util
import io
import json
import struct
import tempfile
import unittest
import zipfile
import zlib
from pathlib import Path, PurePosixPath
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('audit_built_app',ROOT/'scripts/audit_built_app.py')
if spec is None or spec.loader is None:raise RuntimeError('cannot load audit module')
audit_mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit_mod)


ATLAS_SOURCE='entry/src/main/js/MainAbility/common/periodic_table_atlas.png'
ATLAS_ENTRY='assets/js/MainAbility/common/periodic_table_atlas.png.bin'
WIDTH,HEIGHT=1152,648


def unit_atlas_fixture(width=WIDTH,height=HEIGHT,alternate=False):
    """Synthetic RGB PNG + BGRA bin for unit tests, NOT a captured SDK output.

    Alternating rows and unequal R/B values expose row/channel-order mistakes.
    PNG construction uses only stdlib so the audit suite needs no Pillow.
    """
    pairs=(((17 if alternate else 16,27,42),(240,243,248)),
           ((13,16,23),(121,200,246)))
    rgb_rows=[b''.join(bytes(c) for c in row)*(width//2) for row in pairs]
    bgra_rows=[b''.join(bytes((b,g,r,255)) for r,g,b in row)*(width//2) for row in pairs]
    scanlines=b''.join(b'\0'+rgb_rows[y%2] for y in range(height))
    pixels=b''.join(bgra_rows[y%2] for y in range(height))

    def chunk(kind,data):
        return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))

    png=(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))
         +chunk(b'IDAT',zlib.compress(scanlines))+chunk(b'IEND',b''))
    return png,bytes.fromhex('00010000')+struct.pack('<HH',width,height)+pixels


UNIT_PNG,UNIT_ATLAS_BIN=unit_atlas_fixture()
UNIT_MANIFEST={
    'schema_version':1,'source':ATLAS_SOURCE,'width':WIDTH,'height':HEIGHT,
    'pixel_format':'BGRA8888','source_png_sha256':hashlib.sha256(UNIT_PNG).hexdigest(),
    'pixels_bgra_sha256':hashlib.sha256(UNIT_ATLAS_BIN[8:]).hexdigest(),
}


def payload_entries(oversized=False,tiles=False,atlas=True,unexpected=False,version_name='1.1.0',
                    atlas_bytes=UNIT_ATLAS_BIN):
    # The whole archive is a synthetic unit fixture, not a real build/signature.
    entries={
        'config.json':json.dumps({'app':{'bundleName':'periodic.nexus.qu84q','version':{'code':1001000,'name':version_name}}}).encode(),
        'assets/js/MainAbility/app.js':b'a'*(49153 if oversized else 100),
        'assets/js/MainAbility/pages/index/index.js':b'i'*200,
        'assets/js/MainAbility/pages/detail/detail.js':b'd'*300,
        'assets/entry/resources/base/media/icon.png.bin':b'x'*20,
        'assets/entry/resources/base/media/icon_small.png.bin':b'y'*10,
    }
    if atlas:entries[ATLAS_ENTRY]=atlas_bytes
    if tiles:entries['assets/js/MainAbility/common/tiles/a/1.png.bin']=b'z'
    if unexpected:entries['assets/js/MainAbility/common/extra.png.bin']=b'q'
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


def make_artifact(path,kind='app',entries=None,**kw):
    if entries is None:entries=payload_entries(**kw)
    if kind=='app':data=zip_bytes({'entry-default-unsigned.hap':zip_bytes(entries)})
    elif kind=='hap':data=zip_bytes(entries)
    elif kind=='signed-hap':data=zip_bytes({'signed.bin':signed_bin(entries)})
    else:raise ValueError(kind)
    path.write_bytes(data)


class AuditBuiltAppTest(unittest.TestCase):
    def setUp(self):
        td=tempfile.TemporaryDirectory();self.addCleanup(td.cleanup)
        self.source_root=Path(td.name)
        self.source=self.source_root/ATLAS_SOURCE
        self.source.parent.mkdir(parents=True);self.source.write_bytes(UNIT_PNG)
        self.manifest=self.source_root/'tools/atlas_manifest.json'
        self.manifest.parent.mkdir();self.write_manifest(UNIT_MANIFEST)
        root_patch=patch.object(audit_mod,'ROOT',self.source_root,create=True)
        root_patch.start();self.addCleanup(root_patch.stop)

    def write_manifest(self,metadata):
        self.manifest.write_text(json.dumps(metadata),encoding='utf-8')

    def assert_atlas_rejected(self,blob=UNIT_ATLAS_BIN,message='atlas',kind='app'):
        path=self.source_root/('rejected.'+kind)
        make_artifact(path,kind,atlas_bytes=blob)
        with self.assertRaisesRegex(AssertionError,message):audit_mod.audit(path)

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
            self.assertEqual(report['container'],'app')
            self.assertEqual(report['image_bin_total'],len(UNIT_ATLAS_BIN)+30)
            self.assertEqual(report['atlas_image_bin'],ATLAS_ENTRY)
            self.assertEqual(report.get('atlas_validation'),{
                'width':WIDTH,'height':HEIGHT,'pixel_format':'BGRA8888',
                'source_png_sha256':UNIT_MANIFEST['source_png_sha256'],
                'pixels_bgra_sha256':UNIT_MANIFEST['pixels_bgra_sha256'],
            })

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

    def test_requires_single_atlas_and_rejects_other_images(self):
        with tempfile.TemporaryDirectory() as td:
            missing=Path(td)/'missing.app';make_artifact(missing,atlas=False)
            with self.assertRaises(AssertionError):audit_mod.audit(missing)
            extra=Path(td)/'extra.app';make_artifact(extra,unexpected=True)
            with self.assertRaises(AssertionError):audit_mod.audit(extra)

    def test_requires_exact_single_atlas_path_in_all_containers(self):
        wrong_paths=('assets/js/OtherAbility/common/periodic_table_atlas.png.bin',
                     'assets/js/MainAbility/other/common/periodic_table_atlas.png.bin')
        for kind in ('app','hap','signed-hap'):
            for paths in ((),(wrong_paths[0],),(wrong_paths[1],),
                          (ATLAS_ENTRY,wrong_paths[0]),(ATLAS_ENTRY,wrong_paths[1])):
                with self.subTest(kind=kind,atlas_paths=paths):
                    entries=payload_entries(atlas=False)
                    entries.update({name:UNIT_ATLAS_BIN for name in paths})
                    p=self.source_root/('wrong-path.'+kind)
                    make_artifact(p,kind,entries=entries)
                    with self.assertRaisesRegex(AssertionError,'atlas'):audit_mod.audit(p)

    def test_rejects_signed_header_identity_mismatch(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'wrong-id.hap'
            p.write_bytes(zip_bytes({'signed.bin':signed_bin(payload_entries(),'other.bundle')}))
            with self.assertRaises(AssertionError):audit_mod.audit(p)

    def test_rejects_wrong_version_name_in_signed_hap(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'bad.hap';make_artifact(p,'signed-hap',version_name='9.9.9')
            with self.assertRaises(AssertionError):audit_mod.audit(p)


    def test_rejects_fake_or_invalid_atlas_header(self):
        for blob in (b'p'*1000,b'',b'\0'*7,b'\x01\0\0\0'+UNIT_ATLAS_BIN[4:],
                     b'\0\x01\x01\0'+UNIT_ATLAS_BIN[4:]):
            with self.subTest(header=blob[:8].hex()):
                self.assert_atlas_rejected(blob,'atlas.*header')

    def test_rejects_truncated_or_padded_atlas_pixels(self):
        for blob in (UNIT_ATLAS_BIN[:8],UNIT_ATLAS_BIN[:-1],UNIT_ATLAS_BIN+b'\0'):
            with self.subTest(length=len(blob)):
                self.assert_atlas_rejected(blob,'atlas.*length')

    def test_rejects_wrong_atlas_dimensions_even_with_same_pixel_count(self):
        for width,height in ((HEIGHT,WIDTH),(0,HEIGHT),(WIDTH,0)):
            with self.subTest(size=(width,height)):
                blob=UNIT_ATLAS_BIN[:4]+struct.pack('<HH',width,height)+UNIT_ATLAS_BIN[8:]
                self.assert_atlas_rejected(blob,'atlas.*dimensions')

    def test_rejects_blank_atlas_with_valid_header_and_length(self):
        for pixel in (b'\0\0\0\0',b'\x17\x10\x0d\xff'):
            with self.subTest(pixel=pixel.hex()):
                self.assert_atlas_rejected(UNIT_ATLAS_BIN[:8]+pixel*(WIDTH*HEIGHT),'atlas.*pixel')

    def test_rejects_corrupt_atlas_pixels_in_all_containers(self):
        corrupt=bytearray(UNIT_ATLAS_BIN);corrupt[-2]^=1
        for kind in ('app','hap','signed-hap'):
            with self.subTest(kind=kind):
                self.assert_atlas_rejected(bytes(corrupt),'atlas.*pixel',kind)

    def test_rejects_wrong_channel_or_row_order(self):
        rgba=bytearray(UNIT_ATLAS_BIN[8:]);rgba[0::4],rgba[2::4]=rgba[2::4],rgba[0::4]
        stride=WIDTH*4
        flipped=b''.join(UNIT_ATLAS_BIN[8+y*stride:8+(y+1)*stride] for y in reversed(range(HEIGHT)))
        for name,pixels in (('RGBA',rgba),('bottom-up',flipped)):
            with self.subTest(order=name):
                self.assert_atlas_rejected(UNIT_ATLAS_BIN[:8]+pixels,'atlas.*pixel')

    def test_rejects_changed_source_without_regenerating_manifest(self):
        self.source.write_bytes(unit_atlas_fixture(alternate=True)[0])
        self.assert_atlas_rejected(message='atlas source.*sha256')

    def test_rejects_old_built_pixels_after_manifest_regeneration(self):
        png,blob=unit_atlas_fixture(alternate=True)
        self.source.write_bytes(png)
        self.write_manifest(dict(UNIT_MANIFEST,source_png_sha256=hashlib.sha256(png).hexdigest(),
                                 pixels_bgra_sha256=hashlib.sha256(blob[8:]).hexdigest()))
        self.assert_atlas_rejected(message='atlas.*pixel')

    def test_rejects_missing_atlas_source(self):
        self.source.unlink()
        self.assert_atlas_rejected(message='atlas source')

    def test_rejects_missing_or_malformed_manifest(self):
        for content in (None,'{','[]','{}'):
            with self.subTest(manifest=content):
                if content is None:self.manifest.unlink(missing_ok=True)
                else:self.manifest.write_text(content,encoding='utf-8')
                self.assert_atlas_rejected(message='atlas manifest')

    def test_rejects_invalid_manifest_metadata(self):
        for key,value in (('schema_version',2),('pixel_format','RGBA8888'),
                          ('source','other.png'),('pixels_bgra_sha256','g'*64),
                          ('source_png_sha256',None)):
            with self.subTest(field=key):
                self.write_manifest(dict(UNIT_MANIFEST,**{key:value}))
                self.assert_atlas_rejected(message='atlas manifest')

    def test_rejects_manifest_changing_the_required_dimensions(self):
        width,height=WIDTH//2,HEIGHT*2
        self.write_manifest(dict(UNIT_MANIFEST,width=width,height=height))
        blob=UNIT_ATLAS_BIN[:4]+struct.pack('<HH',width,height)+UNIT_ATLAS_BIN[8:]
        self.assert_atlas_rejected(blob,'atlas manifest.*dimensions')

    def test_rejects_manifest_with_wrong_source_digest(self):
        self.write_manifest(dict(UNIT_MANIFEST,source_png_sha256='0'*64))
        self.assert_atlas_rejected(message='atlas source.*sha256')

    def test_rejects_manifest_with_wrong_pixel_digest(self):
        self.write_manifest(dict(UNIT_MANIFEST,pixels_bgra_sha256='0'*64))
        self.assert_atlas_rejected(message='atlas.*pixel')

    def test_repository_manifest_matches_current_source_png(self):
        path=ROOT/'tools/atlas_manifest.json'
        self.assertTrue(path.is_file(),'generate the host-only atlas manifest')
        manifest=json.loads(path.read_text(encoding='utf-8'))
        png=(ROOT/ATLAS_SOURCE).read_bytes()
        self.assertEqual(manifest['source'],ATLAS_SOURCE)
        self.assertEqual(manifest['source_png_sha256'],hashlib.sha256(png).hexdigest())
        self.assertEqual((manifest['width'],manifest['height']),struct.unpack('>II',png[16:24]))
        self.assertEqual((manifest['width'],manifest['height']),(WIDTH,HEIGHT))
        self.assertEqual(manifest['pixel_format'],'BGRA8888')


@unittest.skipUnless(importlib.util.find_spec('PIL'),'Pillow is only required by the local generator')
class AtlasManifestGeneratorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec=importlib.util.spec_from_file_location('generate_table_atlas',ROOT/'tools/generate_table_atlas.py')
        if spec is None or spec.loader is None:raise RuntimeError('cannot load atlas generator')
        cls.generator=importlib.util.module_from_spec(spec);spec.loader.exec_module(cls.generator)

    def writer(self):
        writer=getattr(self.generator,'write_manifest',None)
        if not callable(writer):self.fail('generator must emit a source-bound BGRA manifest')
        return writer

    def test_generator_records_exact_png_and_bgra_hashes(self):
        writer=self.writer()
        with tempfile.TemporaryDirectory() as td:
            source=Path(td)/'unit.png';source.write_bytes(UNIT_PNG)
            manifest=Path(td)/'tools/atlas_manifest.json'
            writer(source,manifest)
            self.assertEqual(json.loads(manifest.read_text(encoding='utf-8')),UNIT_MANIFEST)
            self.assertEqual(source.read_bytes(),UNIT_PNG)

    def test_generator_refuses_wrong_source_dimensions(self):
        writer=self.writer()
        with tempfile.TemporaryDirectory() as td:
            source=Path(td)/'small-unit.png';source.write_bytes(unit_atlas_fixture(16,8)[0])
            manifest=Path(td)/'atlas_manifest.json'
            with self.assertRaisesRegex(RuntimeError,'atlas size'):writer(source,manifest)
            self.assertFalse(manifest.exists())


if __name__=='__main__':unittest.main()
