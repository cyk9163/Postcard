import json,urllib.request,urllib.parse,pathlib,time,re,html
from PIL import Image,ImageOps,ImageDraw
R=pathlib.Path(__file__).resolve().parents[1]
def api(host,**params):
 u='https://'+host+'/w/api.php?'+urllib.parse.urlencode(dict(format='json',**params))
 with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'ManyouTravelPrototype/0.3 (licensed postcard research)'}),timeout=60) as f:return json.load(f)
entries=[
('museum','墨尔本博物馆','Melbourne Museum','Melbourne Museum 2012.JPG'),
('exhibition','皇家展览馆','Royal Exhibition Building','Aerial Photo of Royal Exhibition Building, Melbourne.jpg'),
('carlton','卡尔顿花园','Carlton Gardens','Aerial Photo of Royal Exhibition Building, Melbourne.jpg'),
('ngv','维多利亚国家美术馆','National Gallery of Victoria','National Gallery of Victoria 2024.jpg'),
('acmi','澳大利亚动态影像中心','Australian Centre for the Moving Image','Australian Centre for the Moving Image.jpg'),
('market','维多利亚女王市场','Queen Victoria Market','Aerial photograph of Queen Victoria Market.jpg'),
('cathedral','圣保罗大教堂',"St Paul's Cathedral, Melbourne",'Ac.stpauls1.jpg'),
('patrick','圣帕特里克大教堂',"St Patrick's Cathedral, Melbourne",'Ac.stpats2.JPG'),
('fitzroy','菲茨罗伊花园','Fitzroy Gardens','Fitzroy Gardens in winter.jpg'),
('parliament','维多利亚议会大厦','Parliament House, Melbourne','Parliament House Melbourne 2010.jpg'),
('townhall','墨尔本市政厅','Melbourne Town Hall','Melbourne Town Hall October 2023.jpg'),
('cooks','库克船长小屋',"Cooks' Cottage",'Melbourne Capt Cooks Cottage - outer00.jpg'),
('stkilda','圣基尔达码头','St Kilda Pier','St Kilda Pier View.jpg'),
('albert','阿尔伯特公园湖','Albert Park and Lake','Albert park and lake.jpg'),
('docklands','墨尔本港区','Docklands, Victoria','Melbourne from Waterfront City, Docklands Pano, 20.07.06.jpg')]
infos=api('commons.wikimedia.org',action='query',titles='|'.join('File:'+x[3] for x in entries),prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1200)['query']['pages']
byname={p['title']:p for p in infos.values()}
coords=api('en.wikipedia.org',action='query',titles='|'.join(x[2] for x in entries),prop='coordinates',redirects=1)['query']['pages'];bytitle={p['title']:p for p in coords.values()}
cached=json.loads((R/'production/city-image-candidates.json').read_text());bytitle.update({k:v for k,v in cached.items() if v.get('coordinates')})
for missing in [x[2] for x in entries if not bytitle.get(x[2],{}).get('coordinates')]:
 pages=api('en.wikipedia.org',action='query',titles=missing,prop='coordinates',redirects=1)['query']['pages'];bytitle[missing]=next(iter(pages.values()));time.sleep(1)
clean=lambda s:html.unescape(re.sub('<[^>]+>','',s or ''))
out=[]
for ident,name,title,file in entries:
 try:
  p=byname['File:'+file];info=p['imageinfo'][0];m=info['extmetadata'];lic=clean(m.get('LicenseShortName',{}).get('value',''));assert lic.startswith(('CC BY','CC0')) or 'Public domain' in lic,lic
  c=bytitle[title]['coordinates'][0];dest=R/f'production/references/{ident}-v2.jpg'
  if not dest.exists():
   with urllib.request.urlopen(urllib.request.Request(info.get('thumburl',info['url']),headers={'User-Agent':'ManyouTravelPrototype/0.3'}),timeout=60) as f:dest.write_bytes(f.read())
  with Image.open(dest) as im:
   im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((1152,1152));im.save(R/f'.local/ComfyUI/input/{ident}.png')
  out.append(dict(id=ident,name=name,english=title,lat=c['lat'],lng=c['lon'],radius=300,area='MELBOURNE',description='在'+name+'慢慢走，把今天的新发现放进旅册。',accent='#547966',image=f'/cards/city-v2/{ident}-landmark.webp',source=info['descriptionurl'],url=info['url'],author=clean(m.get('Artist',{}).get('value','')),license=lic,licenseUrl=clean(m.get('LicenseUrl',{}).get('value','')),coordinates='https://en.wikipedia.org/wiki/'+urllib.parse.quote(title.replace(' ','_'))))
  print('READY',ident,lic,flush=True)
 except Exception as e:print('FAILED',ident,str(e),flush=True)
 time.sleep(1)
 (R/'content/expanded-references.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
sheet=Image.new('RGB',(1000,((len(out)+3)//4)*210),'#eee');draw=ImageDraw.Draw(sheet)
for i,x in enumerate(out):
 im=Image.open(R/f'production/references/{x["id"]}-v2.jpg').convert('RGB');im.thumbnail((245,178));px=i%4*250;py=i//4*210;sheet.paste(im,(px,py));draw.text((px+5,py+184),x['id'],fill='black')
sheet.save(R/'production/reference-review-v3.jpg')
