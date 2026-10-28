#!/usr/bin/env python3
"""Audit the actual Lite .app/.hap payload, including Huawei signed.bin containers."""
import argparse
import io
import json
import struct
import sys
import zipfile
from pathlib import Path
from typing import NoReturn

LIMIT=49152
SIGN_MAGIC=b'hw signed app   '


def fail(message)->NoReturn:
    raise AssertionError(message)


def zip_entries(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        return {i.filename:archive.read(i) for i in archive.infolist() if not i.is_dir()}


def signed_bin_entries(raw):
    if len(raw)<37 or raw[0]!=0xBE or raw[-32:-16]!=SIGN_MAGIC:
        fail('invalid Huawei signed.bin header')
    signed_block_size=struct.unpack_from('>I',raw,len(raw)-12)[0]
    unsigned_end=len(raw)-signed_block_size
    if unsigned_end<=5 or unsigned_end>len(raw)-32:
        fail('invalid signed.bin unsigned boundary')
    pos=1
    bundle_len=struct.unpack_from('>I',raw,pos)[0];pos+=4
    if bundle_len<1 or pos+bundle_len>unsigned_end:fail('invalid signed.bin bundle name')
    bundle=raw[pos:pos+bundle_len].decode('utf-8');pos+=bundle_len
    entries={}
    while pos<unsigned_end:
        if pos+4>unsigned_end:fail('truncated signed.bin filename length')
        name_len=struct.unpack_from('>I',raw,pos)[0];pos+=4
        if name_len<1 or pos+name_len>unsigned_end:fail('invalid signed.bin filename')
        name=raw[pos:pos+name_len].decode('utf-8');pos+=name_len
        if pos+4>unsigned_end:fail('truncated signed.bin path length')
        path_len=struct.unpack_from('>I',raw,pos)[0];pos+=4
        if pos+path_len>unsigned_end:fail('invalid signed.bin path')
        rel=raw[pos:pos+path_len].decode('utf-8').lstrip('/');pos+=path_len
        if pos+8>unsigned_end:fail('truncated signed.bin content length')
        content_len=struct.unpack_from('>Q',raw,pos)[0];pos+=8
        if pos+content_len>unsigned_end:fail('invalid signed.bin content')
        full=(rel+'/' if rel else '')+name
        if full in entries:fail('duplicate signed.bin path '+full)
        entries[full]=raw[pos:pos+content_len];pos+=content_len
    if pos!=unsigned_end:fail('signed.bin boundary mismatch')
    return entries,bundle


def load_artifact(path):
    data=Path(path).read_bytes()
    outer=zip_entries(data)
    haps=sorted((n for n in outer if n.endswith('.hap')),key=lambda n:('lite' not in n.lower(),n))
    if haps:
        return zip_entries(outer[haps[0]]),'app',haps[0],None,len(outer[haps[0]])
    if 'signed.bin' in outer:
        entries,bundle=signed_bin_entries(outer['signed.bin'])
        return entries,'signed-hap','signed.bin',bundle,len(outer['signed.bin'])
    if 'config.json' in outer and any(n.startswith('assets/') for n in outer):
        return outer,'hap',Path(path).name,None,len(data)
    fail('neither Lite .app, unsigned .hap nor signed .hap payload: '+str(path))


def audit(app_path):
    app_path=Path(app_path)
    entries,container,payload_name,signed_bundle,payload_bytes=load_artifact(app_path)
    names=list(entries)
    js={name:len(content) for name,content in entries.items()
        if name.startswith('assets/js/MainAbility/') and name.endswith('.js') and not name.endswith('.js.map')}
    required=['assets/js/MainAbility/app.js','assets/js/MainAbility/pages/index/index.js',
              'assets/js/MainAbility/pages/detail/detail.js']
    for name in required:
        if name not in js:fail('missing compiled JS '+name)
    oversized={name:size for name,size in js.items() if size>LIMIT}
    if oversized:fail('compiled Lite JS exceeds 49152 bytes: '+json.dumps(oversized,sort_keys=True))
    tile_entries=[n for n in names if '/common/tiles/' in n or n.endswith('/common/tiles')]
    if tile_entries:fail('per-element bitmap leaked into package: '+','.join(tile_entries[:8]))
    image_bins={name:len(content) for name,content in entries.items()
                if name.endswith(('.png.bin','.jpg.bin','.jpeg.bin','.bmp.bin'))}
    unexpected=[n for n in image_bins if not n.endswith('/media/icon.png.bin')
                and not n.endswith('/media/icon_small.png.bin')]
    if unexpected:fail('unexpected packaged image bins: '+','.join(unexpected[:8]))
    for suffix in ('/media/icon.png.bin','/media/icon_small.png.bin'):
        if not any(n.endswith(suffix) for n in image_bins):fail('missing launcher image bin '+suffix)
    if sum(image_bins.values())>100000:fail('launcher image bins unexpectedly large: '+str(sum(image_bins.values())))
    if 'config.json' not in entries:fail('payload missing config.json')
    config=json.loads(entries['config.json'].decode('utf-8'));app=config.get('app') or {};version=app.get('version') or {}
    if app.get('bundleName')!='periodic.nexus.qu84q':fail('wrong bundleName '+str(app.get('bundleName')))
    if signed_bundle is not None and signed_bundle!=app.get('bundleName'):
        fail('signed.bin header bundle differs from config: '+signed_bundle)
    if version.get('code')!=1001000:fail('wrong version code '+str(version.get('code')))
    if version.get('name')!='1.1.0':fail('wrong version name '+str(version.get('name')))
    return {'artifact':str(app_path),'container':container,'payload':payload_name,
            'payload_bytes':payload_bytes,'compiled_js_bytes':js,'page_limit_bytes':LIMIT,
            'image_bins':image_bins,'image_bin_total':sum(image_bins.values()),
            'bundleName':app.get('bundleName'),'signed_bundle_header':signed_bundle,
            'version':version,'verdict':'PASS'}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('apps',nargs='+');parser.add_argument('--report');args=parser.parse_args()
    reports=[]
    for pattern in args.apps:
        matches=sorted(Path().glob(pattern)) if any(c in pattern for c in '*?[') else [Path(pattern)]
        if not matches:fail('no app matched '+pattern)
        for path in matches:reports.append(audit(path))
    text=json.dumps(reports,ensure_ascii=False,indent=2)
    if args.report:Path(args.report).write_text(text+'\n',encoding='utf-8')
    print(text)

if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('BUILT_APP_AUDIT_FAIL: '+str(exc),file=sys.stderr);raise
