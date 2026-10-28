#!/usr/bin/env python3
"""Reproducible local catalog and low-node UI assets from cited primary data.
Only the build tool uses CPython/Pillow/Node; watch code stays small ES5.
"""
import argparse, hashlib, html, json, math, re, shutil, struct
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / 'entry/src/main/js/MainAbility'
FONT_SHA256 = '2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b'
PILLOW_VERSION = '12.3.0'
BG = '#0c1119'
COLORS = {'alk':'#70433f','alk2':'#6b5136','tr':'#2d5270','post':'#3f5963',
          'met':'#4b536f','nm':'#31595d','hal':'#5a496f','nob':'#365575','lan':'#5e4c3c','act':'#554361'}
GROUPS = {1:'IA',2:'IIA',3:'IIIB',4:'IVB',5:'VB',6:'VIB',7:'VIIB',8:'VIII',9:'VIII',10:'VIII',
          11:'IB',12:'IIB',13:'IIIA',14:'IVA',15:'VA',16:'VIA',17:'VIIA',18:'0族'}
GRID = [[1]+[0]*16+[2], [3,4]+[0]*10+list(range(5,11)), [11,12]+[0]*10+list(range(13,19)),
        list(range(19,37)),list(range(37,55)),[55,56,-1]+list(range(72,87)),
        [87,88,-2]+list(range(104,119)),[0,0,0]+list(range(57,72)),[0,0,0]+list(range(89,104))]

def cmap12_groups(path):
    data=Path(path).read_bytes();num=struct.unpack_from('>H',data,4)[0];cmap=None
    for i in range(num):
        tag,_,offset,length=struct.unpack_from('>4sIII',data,12+i*16)
        if tag==b'cmap':cmap=(offset,length);break
    assert cmap,'font has no cmap table'
    base,_=cmap;count=struct.unpack_from('>H',data,base+2)[0];subtables=[]
    for i in range(count):
        _,_,relative=struct.unpack_from('>HHI',data,base+4+i*8)
        if struct.unpack_from('>H',data,base+relative)[0]==12:subtables.append(base+relative)
    assert subtables,'font has no Unicode format-12 cmap'
    offset=subtables[0];count=struct.unpack_from('>I',data,offset+12)[0]
    return [struct.unpack_from('>III',data,offset+16+i*12) for i in range(count)]

def cmap_has(groups,codepoint):
    lo=0;hi=len(groups)-1
    while lo<=hi:
        mid=(lo+hi)//2;start,end,glyph=groups[mid]
        if codepoint<start:hi=mid-1
        elif codepoint>end:lo=mid+1
        else:return glyph+(codepoint-start)!=0
    return False

class NistParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.rows=[]; self.row=[]; self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag=='tr': self.row=[]
        if tag in ('td','th'):
            self.cell={'text':'','attrs':dict(attrs)}
    def handle_data(self,data):
        if self.cell is not None: self.cell['text']+=data
    def handle_endtag(self,tag):
        if tag in ('td','th') and self.cell is not None:
            self.cell['text']=re.sub(r'\s+',' ',self.cell['text']).strip()
            self.row.append(self.cell); self.cell=None
        if tag=='tr' and self.row: self.rows.append(self.row); self.row=[]

def nist_data(path):
    p=NistParser();p.feed(path.read_text()); spans={}; records={}; weights={}; z=0
    for raw in p.rows:
        if any('colspan' in c['attrs'] for c in raw): continue
        slots={}; nxt={}
        for i,(remaining,text) in spans.items():
            slots[i]=text
            if remaining>1:nxt[i]=(remaining-1,text)
        col=0
        for cell in raw:
            while col in slots: col+=1
            slots[col]=cell['text']; count=int(cell['attrs'].get('rowspan','1'))
            if count>1:nxt[col]=(count-1,cell['text'])
            col+=1
        spans=nxt
        vals=[slots.get(i,'') for i in range(7)]
        if not vals[0].isdigit() or not vals[2].isdigit(): continue
        z=int(vals[0]); a=int(vals[2])
        if not 1<=z<=118:continue
        ab=re.sub(r'\(.*','',vals[4]).replace(' ','')
        try:abundance=float(ab) if ab else 0
        except ValueError:abundance=0
        records.setdefault(z,[]).append({'a':a,'abundance':abundance,'isotopicMass':vals[3]})
        if vals[5]: weights[z]=vals[5]
    assert len(records)==118, ('NIST coverage',len(records),sorted(set(range(1,119))-set(records)))
    return records,weights

def seed_rows():
    rows=json.loads((ROOT/'tools/elements-seed.json').read_text())
    assert len(rows)==118 and [x['z'] for x in rows]==list(range(1,119))
    return rows

def shells_from_config(config):
    noble={'He':[2],'Ne':[2,8],'Ar':[2,8,8],'Kr':[2,8,18,8],'Xe':[2,8,18,18,8],'Rn':[2,8,18,32,18,8]}
    shells=[0]*7
    base=re.search(r'\[(He|Ne|Ar|Kr|Xe|Rn)\]',config)
    if base:
        for i,n in enumerate(noble[base[1]]):shells[i]=n
    for n,orbital,count in re.findall(r'(\d)([spdf])(\d{1,2})',config):shells[int(n)-1]+=int(count)
    while shells and shells[-1]==0:shells.pop()
    return shells

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--font',required=True);a=ap.parse_args()
    raw=json.loads((ROOT/'tools/pubchem-periodic.json').read_text())['Table']
    cols=raw['Columns']['Column']; pub={int(r['Cell'][0]):dict(zip(cols,r['Cell'])) for r in raw['Row']}
    isotopes,std=nist_data(ROOT/'tools/nist-isotopes.html'); seed=seed_rows(); positions={}
    for r,row in enumerate(GRID):
        for c,z in enumerate(row):
            if z>0:positions[z]=(r+1,c+1)
    choices={1:[1,2,3],6:[12,13,14],17:[35,37],29:[63,65],35:[79,81]}
    exceptions={
        1:'氢是非金属；H-1、H-2、H-3的质子数都为1，中子数不同。氢不能机械套碱金属性质。',
        2:'He是例外：最外层2个电子已满，不能套八电子规则；通常化学性质很不活泼。',
        8:'O是例外：常见-2，过氧化物中-1，OF2中+2；不能套最高正价等于最外层电子数。',
        9:'F是例外：化合物中仅-1，单质F2中为0；无正价，不能套最高正价规则。',
        24:'Cr基态为[Ar]3d5 4s1，是构造原理简单填充的例外；过渡元素不套主族最高正价规律。',
        29:'Cu基态为[Ar]3d10 4s1，是简单填充的例外；最外层电子数不等于所有价电子数。'
    }
    notes={
        1:'氕、氘、氚是氢的三种核素。核素改变不改变元素种类。',
        6:'C-12、C-13、C-14是同位素；C-14用于年代测定。金刚石、石墨、C60是同素异形体。',
        11:'Na通常形成Na+；Na2O2与水反应生成NaOH和O2。焰色为黄色。',
        12:'Mg通常形成Mg2+；镁燃烧发出耀眼白光，MgO可与酸反应。',
        13:'Al2O3和Al(OH)3具有两性；金属Al能与酸及强碱溶液反应。',
        14:'Si为半导体；SiO2与HF反应。硅酸通常由可溶性硅酸盐酸化制取。',
        15:'注意白磷、红磷的同素异形体区别；主族最高正价通常为+5。',
        16:'S常见-2、+4、+6；SO2具有还原性及暂时性漂白作用，须区分反应类型。',
        17:'Cl-35和Cl-37分别有18、20个中子。Cl2与水反应生成HCl和HClO；漂白性来自HClO。',
        19:'K通常形成K+；焰色紫色，观察时可透过蓝色钴玻璃排除Na干扰。',
        20:'Ca通常形成Ca2+；CaCO3、CaO、Ca(OH)2之间的转化是常见考点。',
        24:'注意Cr(III)与Cr(VI)的价态和颜色；重铬酸根与铬酸根平衡受酸碱条件影响。',
        25:'Mn常见+2、+4、+7；酸性KMnO4为强氧化剂，终产物取决于反应条件。',
        26:'Fe常见+2、+3；Fe3+遇SCN-显红色，Fe2+的还原性和Fe3+的氧化性常用于转化推断。',
        29:'Cu常见+1、+2；Cu2+溶液常呈蓝色。Cu-63与Cu-65的中子数不同。',
        30:'Zn常见+2；Zn(OH)2具有两性。原电池中Zn常作负极失电子。',
        35:'Br-79和Br-81分别有44、46个中子；氧化性Cl2>Br2>I2，注意卤素置换反应。',
        47:'AgCl、AgBr、AgI分别为白、淡黄、黄色沉淀；卤化银见光易分解。',
        53:'淀粉遇I2显蓝色；I-可被强氧化剂氧化为I2。I-127是核素示例。',
        56:'BaSO4不溶于水和常见酸；检验SO4(2-)须排除CO3(2-)、SO3(2-)等干扰。'
    }
    result=[]
    for meta in seed:
        z=meta['z']; symbol=meta['symbol']; cn=meta['cn']; cat=meta['category']; core=meta['core']; item=pub[z]
        assert item['Symbol']==symbol,(z,item['Symbol'],symbol)
        if 57<=z<=71: cat='lan'
        if 89<=z<=103:cat='act'
        period,group=positions[z]
        if z in range(57,72): period=6;groupText='镧系（附列）'
        elif z in range(89,104):period=7;groupText='锕系（附列）'
        else:groupText='第'+str(group)+'族 / '+GROUPS[group]
        config=item['ElectronConfiguration'].replace('(predicted)','（预测）').strip()
        if z==103: config='[Rn]5f14 7s2 7p1' # ground-state p-electron, modern Lr assignment
        shells=shells_from_config(config); assert sum(shells)==z,(z,symbol,config,shells)
        candidates=isotopes[z]; natural=sorted((x for x in candidates if x['abundance']>0),key=lambda x:-x['abundance'])
        no_std=z in (43,61) or (84<=z<=89) or z>=93
        if no_std:
            bracket=re.fullmatch(r'\[(\d+)\]',std.get(z,'').replace(' ',''))
            chosen=int(bracket[1]) if bracket else candidates[-1]['a']
            iso=choices.get(z,[chosen]); weight='['+str(chosen)+']';weightKind='nuclide'
        else:
            iso=choices.get(z,[x['a'] for x in natural[:3]])
            if not iso:iso=[candidates[0]['a']]
            weight=item['AtomicMass'];weightKind='standard'
        assert all(any(x['a']==v for x in candidates) for v in iso),(z,iso)
        mainGroup=group in (1,2,13,14,15,16,17) and cat not in ('lan','act')
        if z in exceptions:key=exceptions[z]
        elif mainGroup:key='主族：最外层'+str(shells[-1])+'个电子；位置、结构与性质相互联系。通常最高正价='+str(shells[-1])+'，最低负价=最外层电子数-8（非金属）。'
        elif group==18:key='稀有气体最外层通常为8电子；He为2电子。不能把“不活泼”理解为所有稀有气体绝无化合物。'
        elif cat in ('lan','act'):key='内过渡元素位于周期表附列；中子数须针对具体核素计算，不能从平均原子质量取整。'
        else:key='过渡区：最外层电子数不等于价电子数；常有多种价态，不能套主族最高正价规则。'
        oxText=item['OxidationStates'] or '暂无可靠常见价态数据'
        if z in (2,10,18,36):oxText='0（单质；通常不活泼）'
        ev=item['IonizationEnergy']; ion=str(round(float(ev)*96.4853321233,1)) if ev else '—'
        e={'z':z,'symbol':symbol,'cn':cn,'en':item['Name'],'weight':weight,'weightKind':weightKind,
           'category':cat,'period':period,'group':groupText,'shells':shells,'config':config,
           'isotopes':iso,'core':bool(z<=36 or core),'oxidation':oxText,'keyPoint':key,
           'note':notes.get(z,'同周期（主族）从左到右通常原子半径减小，金属性减弱、非金属性增强；同主族向下通常相反。趋势须结合结构与例外判断。'),
           'electronegativity':item['Electronegativity'] or '—','ionization':ion}
        result.append(e)
    compact=[]
    for e in result:
        compact.append([e['symbol'],e['cn'],e['en'],e['weight'],e['weightKind']=='nuclide',e['category'],e['period'],e['group'],e['shells'],e['config'],e['isotopes'],e['core'],e['oxidation'],notes.get(e['z'],''),e['electronegativity'],e['ionization']])
    text='\n'.join(json.dumps(x,ensure_ascii=False,separators=(',',':')) for x in compact)
    quoted=json.dumps(text,ensure_ascii=True)
    special=json.dumps(exceptions,ensure_ascii=True,separators=(',',':'))
    general=json.dumps('同周期（主族）从左到右通常原子半径减小，金属性减弱、非金属性增强；同主族向下通常相反。趋势须结合结构与例外判断。',ensure_ascii=True)
    src='// Generated: one compact bounded string; parse only selected record.\nvar BLOB='+quoted+';\nvar SPECIAL='+special+';\nvar GENERAL='+general+';\n'
    src+=r'''function get(z) {
  if(typeof z!=="number" || z<1 || z>118 || Math.floor(z)!==z) return null;
  var start=0,row=1,end;
  while(row<z) {start=BLOB.indexOf("\n",start)+1;row++;}
  end=BLOB.indexOf("\n",start);if(end<0)end=BLOB.length;
  var r=JSON.parse(BLOB.substring(start,end));
  var e={z:z,symbol:r[0],cn:r[1],en:r[2],weight:r[3],weightKind:r[4]?"nuclide":"standard",category:r[5],period:r[6],group:r[7],shells:r[8],config:r[9],isotopes:r[10],core:r[11],oxidation:r[12],note:r[13]||GENERAL,electronegativity:r[14],ionization:r[15],protons:z,electrons:z};
  var outer=e.shells[e.shells.length-1];
  if(SPECIAL[z]) e.keyPoint=SPECIAL[z];
  else if(e.category==="lan" || e.category==="act") e.keyPoint="内过渡元素位于附列；中子数必须针对核素计算，不能由平均原子质量取整。";
  else if(e.category==="nob") e.keyPoint="稀有气体最外层通常8电子；He为2电子。不活泼不等于绝无化合物。";
  else if(e.category==="tr" || e.category==="post" && e.group.indexOf("IIB")>=0) e.keyPoint="过渡区不套主族最高正价规律；最外层电子数不等于所有价电子数。";
  else e.keyPoint="主族最外层"+outer+"电子，通常最高正价="+outer+"；非金属最低负价通常为最外层电子数-8，注意O/F例外。";
  return e;
}
export default {get:get};
'''.encode('ascii','backslashreplace').decode()
    (MAIN/'common/catalog.js').write_text(src)
    category_codes={'alk':'a','alk2':'b','tr':'t','post':'p','met':'m','nm':'n','hal':'h','nob':'g','lan':'l','act':'c'}
    symbols='|'.join(['']+[e['symbol'] for e in result])
    names='|'.join(['']+[e['cn'] for e in result])
    categories='.'+''.join(category_codes[e['category']] for e in result)
    core='0'+''.join('1' if e['core'] else '0' for e in result)
    code_colors={category_codes[name]:value for name,value in COLORS.items()}
    grid_src='// Generated compact labels for the canvas table; no full element objects.\n'
    grid_src+='var SYMBOLS='+json.dumps(symbols,ensure_ascii=True)+'.split("|");\n'
    grid_src+='var NAMES='+json.dumps(names,ensure_ascii=True)+'.split("|");\n'
    grid_src+='var CATEGORIES='+json.dumps(categories)+';\nvar CORE='+json.dumps(core)+';\n'
    grid_src+='var COLORS='+json.dumps(code_colors,separators=(',',':'))+';\n'
    grid_src+='function symbol(z){if(z===-1)return "57-71";if(z===-2)return "89-103";return z>0&&z<119?SYMBOLS[z]:"";}\n'
    grid_src+='function name(z){if(z===-1)return "\\u9567\\u7cfb";if(z===-2)return "\\u9515\\u7cfb";return z>0&&z<119?NAMES[z]:"";}\n'
    grid_src+='function color(z){if(z===-1)return COLORS.l;if(z===-2)return COLORS.c;return z>0&&z<119?COLORS[CATEGORIES.charAt(z)]:"#0c1119";}\n'
    grid_src+='function isCore(z){return z>0&&z<119&&CORE.charAt(z)==="1";}\nexport default {symbol:symbol,name:name,color:color,isCore:isCore};\n'
    (MAIN/'common/grid.js').write_text(grid_src)
    (ROOT/'tools/elements-curated.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    sources={'pubchem':'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON',
             'nist':'https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=&all=all&isotype=all',
             'curriculum':'https://www.ictr.edu.cn/Uploads/File/2025/02/07/9.%E6%99%AE%E9%80%9A%E9%AB%98%E4%B8%AD%E5%8C%96%E5%AD%A6%E8%AF%BE%E7%A8%8B%E6%A0%87%E5%87%86%EF%BC%882017%E5%B9%B4%E7%89%882020%E5%B9%B4%E4%BF%AE%E8%AE%A2%EF%BC%89.20250207215712.pdf',
            'cn_names':'https://www.chemsoc.org.cn/a2613.html',
             'cn_table':'https://img.chemsoc.org.cn/web/2019/01/%E5%85%83%E7%B4%A0%E5%91%A8%E6%9C%9F%E8%A1%A8%E4%B8%AD%E6%96%87%E7%89%8820190123%E6%9C%80%E6%96%B0(1).pdf',
             'nist_isotopes':sum(len(v) for v in isotopes.values()),'elements':len(result),
             'generator_font_sha256':FONT_SHA256,'pillow_version':PILLOW_VERSION,
             'notes':'NIST representative bracket is a nuclear mass number, not standard atomic weight. Standard abbreviated values follow PubChem. Lr configuration uses modern 7p1 assignment; synthetic element configurations are not Gaokao memorization targets.'}
    for name in ('pubchem-periodic.json','nist-isotopes.html'):sources[name+'_sha256']=hashlib.sha256((ROOT/'tools'/name).read_bytes()).hexdigest()
    (ROOT/'tools/source_manifest.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2))
    metrics=[]; fontPath=Path(a.font)
    font_sha=hashlib.sha256(fontPath.read_bytes()).hexdigest()
    assert font_sha==FONT_SHA256,('unexpected font hash',font_sha)
    assert Image.__version__==PILLOW_VERSION,('unexpected Pillow version',Image.__version__)
    cmap=cmap12_groups(fontPath)
    missing_cmap=[(e['z'],e['cn']) for e in result if any(not cmap_has(cmap,ord(ch)) for ch in e['cn'])]
    assert not missing_cmap,('chemical-name codepoints absent from font cmap',missing_cmap)
    fonts={}
    def font(size):
        size=max(1,round(size))
        if size not in fonts:fonts[size]=ImageFont.truetype(str(fontPath),size)
        return fonts[size]
    probeFont=font(32)
    missing=[e['z'] for e in result if not probeFont.getmask(e['cn']).getbbox()]
    assert not missing,('missing chemical-name glyphs',missing)
    def tile(e,size):
        h=round(size*128/114); scale=size/114;im=Image.new('RGB',(size,h),BG);d=ImageDraw.Draw(im)
        def p(v):return round(v*scale)
        d.rounded_rectangle((p(2),p(2),size-p(2)-1,h-p(2)-1),radius=p(7),fill=COLORS.get(e['category'],'#24334d'))
        if e['z']>0:
            d.text((p(100),p(10)),str(e['z']),font=font(p(23)),fill='#becbd8',anchor='rt')
            if e['core']:d.ellipse((p(12),p(15),p(18),p(21)),fill='#f6c879')
            parts=[(e['symbol'],(size/2,p(69)),p(48)),(e['cn'],(size/2,p(107)),p(25))]
        else:
            parts=[(e['symbol'],(size/2,p(56)),p(23)),(e['cn'],(size/2,p(94)),p(25))]
        for value,point,fs in parts:
            bbox=d.textbbox(point,value,font=font(fs),anchor='mm')
            assert bbox[0]>=p(4) and bbox[2]<=size-p(4) and bbox[1]>=p(4) and bbox[3]<=h-p(4),(e['z'],value,size,bbox)
            d.text(point,value,font=font(fs),fill='#f0f3f8',anchor='mm')
            metrics.append({'z':e['z'],'text':value,'size':size,'bbox':bbox,'canvas':[size,h]})
        return im
    # Never package per-element bitmaps: Lite converts every PNG to raw RGBA .bin.
    # 241 former tiles expanded to about 27 MiB. Canvas renders the table instead.
    tiles=MAIN/'common/tiles'
    if tiles.exists():shutil.rmtree(tiles)
    # A new, readable element-card mark; no hand-invented bitmap alphabet.
    size=456;im=Image.new('RGB',(size,size),'#101b2a');d=ImageDraw.Draw(im)
    d.rounded_rectangle((25,25,431,431),radius=85,fill='#142c3b',outline='#55d6d1',width=9)
    d.text((74,69),'26',font=font(61),fill='#9ee1e7',anchor='lt')
    d.text((size/2,224),'Fe',font=font(208),fill='#edf7fc',anchor='mm')
    # A small step-shaped periodic-table motif, distinct at launcher size.
    for r,row in enumerate([[0,5],[0,1,4,5],[0,1,2,3,4,5]]):
        for c in row:
            x=107+c*41;y=322+r*26;d.rounded_rectangle((x,y,x+27,y+16),radius=3,fill='#55d6d1' if c<2 else '#7ca6d6')
    previews=ROOT/'qa';previews.mkdir(exist_ok=True)
    im.resize((512,512),Image.Resampling.LANCZOS).save(previews/'icon-preview.png')
    media=ROOT/'entry/src/main/resources/base/media'
    for side,name in [(114,'icon.png'),(80,'icon_small.png')]:
        ico=im.resize((side,side),Image.Resampling.LANCZOS).quantize(colors=32,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
        media.mkdir(exist_ok=True);ico.save(media/name,optimize=True)
        assert (media/name).stat().st_size<5120
    (ROOT/'qa/tile-metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
    sheet=Image.new('RGB',(6*128,20*146),BG);d=ImageDraw.Draw(sheet)
    for i,e in enumerate(result):
        x=(i%6)*128;y=(i//6)*146;sheet.paste(tile(e,114),(x+7,y+5))
        d.text((x+7,y+134),str(e['z'])+' '+e['symbol'],font=font(11),fill='#b5c1cf')
    sheet.save(previews/'all-118-tiles.png')
    print(json.dumps({'elements':len(result),'isotopes':sources['nist_isotopes'],'catalog_js_bytes':len(src.encode()),
                      'grid_js_bytes':len(grid_src.encode()),'blob_utf8_bytes':len(text.encode()),'packaged_tiles':0,
                      'nuclear_examples':{str(z):choices[z] for z in choices}},ensure_ascii=False))

if __name__=='__main__':main()
