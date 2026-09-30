"""Resolve public coordinates and licensed reference photos for the expanded city pack."""
import json,urllib.request,urllib.parse,pathlib,time,html,re
from PIL import Image,ImageOps,ImageDraw
R=pathlib.Path(__file__).resolve().parents[1]
ITEMS=[('museum','墨尔本博物馆','Melbourne Museum'),('exhibition','皇家展览馆','Royal Exhibition Building'),('carlton','卡尔顿花园','Carlton Gardens'),('ngv','维多利亚国家美术馆','National Gallery of Victoria'),('acmi','澳大利亚动态影像中心','ACMI'),('market','维多利亚女王市场','Queen Victoria Market'),('cathedral','圣保罗大教堂','St Paul\'s Cathedral, Melbourne'),('patrick','圣帕特里克大教堂','St Patrick\'s Cathedral, Melbourne'),('fitzroy','菲茨罗伊花园','Fitzroy Gardens'),('parliament','维多利亚议会大厦','Parliament House, Melbourne'),('townhall','墨尔本市政厅','Melbourne Town Hall'),('brighton','布莱顿海滩彩虹小屋','Brighton Bathing Boxes'),('stkilda','圣基尔达码头','St Kilda Pier'),('albert','阿尔伯特公园湖','Albert Park and Lake'),('docklands','墨尔本港区','Docklands, Victoria')]
def api(host,**params):
 url='https://'+host+'/w/api.php?'+urllib.parse.urlencode(dict(format='json',**params))
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ManyouTravelPrototype/0.3 (licensed art research)'}),timeout=45) as f:return json.load(f)
  except Exception:
   if attempt==2:raise
   time.sleep(2)
def clean(s):return html.unescape(re.sub('<[^>]+>','',s or ''))
out=[]
for ident,name,title in ITEMS:
 target=R/'production/references'/f'{ident}.jpg'
 try:
  pages=api('en.wikipedia.org',action='query',titles=title,prop='coordinates|images',imlimit=30,redirects=1)['query']['pages'];page=next(iter(pages.values()));coord=page.get('coordinates',[None])[0]
  if not coord:raise ValueError('No coordinates: '+title)
  filenames=[x['title'] for x in page.get('images',[]) if re.search(r'\.(jpg|jpeg|png)$',x['title'],re.I) and not re.search('logo|flag|icon|map|coat|signature|commons|pictogram',x['title'],re.I)]
  chosen=None
  for filename in filenames:
   infos=api('commons.wikimedia.org',action='query',titles=filename,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1200)['query']['pages']
   info=next(iter(infos.values())).get('imageinfo',[None])[0]
   if not info:continue
   meta=info.get('extmetadata',{});license=clean(meta.get('LicenseShortName',{}).get('value',''))
   if not (license.startswith('CC BY') or license.startswith('CC0') or 'Public domain' in license):continue
   if re.search('NC|ND',license):continue
   chosen=dict(id=ident,name=name,place=title,lat=coord['lat'],lng=coord['lon'],radius=350,area='MELBOURNE',description='慢慢探索'+name+'，把今天的一点见闻留在旅册里。',accent='#547966',coordinates='https://en.wikipedia.org/wiki/'+urllib.parse.quote(page['title'].replace(' ','_')),source=info['descriptionurl'],url=info.get('thumburl',info['url']),author=clean(meta.get('Artist',{}).get('value','Unknown')),license=license,licenseUrl=clean(meta.get('LicenseUrl',{}).get('value','')))
   if not target.exists():
    with urllib.request.urlopen(urllib.request.Request(chosen['url'],headers={'User-Agent':'ManyouTravelPrototype/0.3'}),timeout=60) as f:target.write_bytes(f.read())
   with Image.open(target) as im:
    im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((1152,1152));im.save(R/f'.local/ComfyUI/input/{ident}.png')
   break
  if not chosen:raise ValueError('No licensed photo')
  out.append(chosen);print('READY',ident,chosen['source'],chosen['license'],flush=True)
 except Exception as e:print('FAILED',ident,str(e),flush=True)
 (R/'content/expanded-references.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
sheet=Image.new('RGB',(1000,((len(out)+3)//4)*205),'#eee');draw=ImageDraw.Draw(sheet)
for i,x in enumerate(out):
 im=Image.open(R/f'production/references/{x["id"]}.jpg').convert('RGB');im.thumbnail((245,175));px=(i%4)*250;py=(i//4)*205;sheet.paste(im,(px,py));draw.text((px+5,py+180),x['id'],fill='black')
sheet.save(R/'production/reference-review-v3.jpg')
