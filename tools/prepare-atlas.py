"""Batched, resumable public reference collection for the 100-city expansion."""
import json, pathlib, importlib.util, time, re, urllib.parse, argparse
from PIL import Image, ImageOps, ImageDraw
R=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prep',R/'tools/prepare-world.py');prep=importlib.util.module_from_spec(spec);spec.loader.exec_module(prep)
parser=argparse.ArgumentParser();parser.add_argument('--pack',default='atlas');args=parser.parse_args()
assert re.fullmatch('[a-z-]+',args.pack)
folder=R/'production/world-references';cache=folder/f'{args.pack}-pages.json'
catalog=json.loads((R/f'content/{args.pack}-candidates.json').read_text(encoding='utf-8'))
cities=[{**c,'spots':[spot]} for c in catalog for spot in c.get('spots',[])]
pages=json.loads(cache.read_text()) if cache.exists() else {}
for offset in range(0,len(cities),10):
 titles=[c['spots'][0][2] for c in cities[offset:offset+10] if c['spots'][0][2] not in pages]
 if not titles:continue
 q=prep.api('en.wikipedia.org',action='query',titles='|'.join(titles),redirects=1,prop='coordinates|pageimages|pageprops',piprop='name',pilicense='free')['query']
 aliases={x['from']:x['to'] for k in ['normalized','redirects'] for x in q.get(k,[])}
 for title in titles:
  resolved=title
  while resolved in aliases:resolved=aliases[resolved]
  pages[title]=next((p for p in q['pages'] if p['title']==resolved),{})
 cache.write_text(json.dumps(pages),encoding='utf-8');print('PAGES',offset,flush=True)
dest=R/'content/world-references.json';out=json.loads(dest.read_text(encoding='utf-8'))
overridesPath=folder/f'{args.pack}-overrides.json';overrides=json.loads(overridesPath.read_text()) if overridesPath.exists() else {}
infoPath=folder/f'{args.pack}-imageinfo.json';infos=json.loads(infoPath.read_text()) if infoPath.exists() else {}
files=[overrides.get(c['id']+'-'+c['spots'][0][0],{}).get('file',pages[c['spots'][0][2]].get('pageimage','')) for c in cities]
for offset in range(0,len(files),15):
 pending=[f for f in files[offset:offset+15] if f and f.replace('_',' ') not in infos]
 if not pending:continue
 q=prep.api('commons.wikimedia.org',action='query',titles='|'.join('File:'+f for f in pending),prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1280)['query']
 for page in q['pages']:
  if page.get('imageinfo'):infos[page['title'][5:].replace('_',' ')]=page['imageinfo'][0]
 infoPath.write_text(json.dumps(infos),encoding='utf-8');print('IMAGE METADATA',offset,flush=True)
for city in cities:
 slug,name,title=city['spots'][0];ident=city['id']+'-'+slug
 if any(x['id']==ident for x in out):continue
 try:
  p=pages[title];coord=p.get('coordinates',[None])[0];override=overrides.get(ident,{})
  coord=override.get('coord',coord)
  if not coord:raise ValueError('No coordinates '+str(p.get('pageprops',{})))
  file=override.get('file',p.get('pageimage',''))
  if not file or re.search(r'logo|\.svg$|locator|map\b|flag',file,re.I):raise ValueError('Need photograph: '+file)
  info=infos.get(file.replace('_',' '))
  for host in ([] if info else ['en.wikipedia.org']):
   data=prep.api(host,action='query',titles='File:'+file,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1280)['query']['pages'][0]
   if data.get('imageinfo'):info=data['imageinfo'][0];break
  if not info:raise ValueError('No image metadata '+file)
  meta=info['extmetadata'];lic=prep.clean(meta.get('LicenseShortName',{}).get('value',''));normalized=lic.replace('-',' ')
  if not (normalized.startswith(('CC BY','CC0')) or 'Public domain' in normalized) or re.search(r'\b(NC|ND)\b',normalized):raise ValueError('Unsupported license '+lic+' '+file)
  target=folder/(ident+'.jpg');target.write_bytes(prep.get(info.get('thumburl',info['url'])))
  with Image.open(target) as im:
   im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((1280,1280));im.save(target,'JPEG',quality=95);im.save(R/f'.local/ComfyUI/input/{ident}.png')
  item=dict(id=ident,cityId=city['id'],name=name,english=p.get('title',title),lat=coord['lat'],lng=coord['lon'],radius=250,area=city['english'].upper(),description=f'在{name}停下脚步，把{city["name"]}的这一刻留在旅册里。',accent='#547966',image=f'/cards/city-v2/{ident}-landmark.webp',source=info['descriptionurl'],url=info['url'],author=prep.clean(meta.get('Artist',{}).get('value','')),license=lic,licenseUrl=prep.clean(meta.get('LicenseUrl',{}).get('value','')),coordinates='https://en.wikipedia.org/wiki/'+urllib.parse.quote(p.get('title',title).replace(' ','_')))
  out.append(item);temp=dest.with_suffix('.tmp');temp.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');temp.replace(dest);print('READY',ident,flush=True)
 except Exception as e:print('FAILED',ident,str(e),flush=True)
new=[p for p in out if p['id'] in {c['id']+'-'+c['spots'][0][0] for c in cities}]
for batch in range((len(new)+11)//12):
 subset=new[batch*12:(batch+1)*12];sheet=Image.new('RGB',(1200,((len(subset)+3)//4)*230),'#eee');draw=ImageDraw.Draw(sheet)
 for i,x in enumerate(subset):
  im=Image.open(folder/(x['id']+'.jpg'));im.thumbnail((295,200));px=i%4*300;py=i//4*230;sheet.paste(im,(px,py));draw.text((px+4,py+204),x['id'],fill='black')
 sheet.save(folder/f'{args.pack}-review-{batch}.jpg')
print('REFERENCES',len(new),'/',len(cities),flush=True)
