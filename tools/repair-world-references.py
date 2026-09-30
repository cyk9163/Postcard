"""Apply reviewed photo choices and fill missing references using batched metadata."""
import importlib.util,json,pathlib,urllib.parse,time,sys
from PIL import Image,ImageOps
sys.stdout.reconfigure(encoding='utf-8')
R=pathlib.Path(__file__).resolve().parents[1];s=importlib.util.spec_from_file_location('prepare',R/'tools/prepare-world.py');w=importlib.util.module_from_spec(s);s.loader.exec_module(w)
refs=R/'content/world-references.json';items=json.loads(refs.read_text(encoding='utf-8'));cities=json.loads((R/'content/world-cities.json').read_text(encoding='utf-8'))
pages={}
for filename in ['world-retry-pages.json','world-alternatives-extra.json','Dubai-Frame-files.json','Gyeongbokgung-files.json']:
 for p in json.loads((R/'production'/filename).read_text(encoding='utf-8'))['query']['pages']:pages[p['title']]=p
more=w.api('en.wikipedia.org',action='query',titles='Empire State Building|Sydney Opera House',prop='coordinates|pageimages',piprop='name',pilicense='free')
for p in more['query']['pages']:pages[p['title']]=p
wd=w.api('www.wikidata.org',action='wbgetentities',ids='Q91274',props='claims')['entities']['Q91274']['claims']['P625'][0]['mainsnak']['datavalue']['value']
pages['Galata Tower']['coordinates']=[{'lat':wd['latitude'],'lon':wd['longitude']}]
overrides={
 'seoul-gyeongbokgung':'Front view of the Imperial Throne Hall Geunjeongjeon at Gyeongbokgung Palace with blue sky in Seoul.jpg',
 'kuala-lumpur-petronas':'Petronas Towers.JPG',
 'hong-kong-clock-tower':'Former Kowloon-Canton Railway Clock Tower, Tsim Sha Tsui (Hong Kong).jpg',
 'taipei-taipei-101':'101.portrait.altonthompson.jpg',
 'dubai-frame':'Dubai Frame in Dubai, United Arab Emirates.jpg',
}
aliases={'N Seoul Tower':'Namsan Seoul Tower','Merdeka Square, Kuala Lumpur':'Independence Square (Kuala Lumpur)','Lungshan Temple':'Longshan Temple (Taipei)'}
pending=[]
for city in cities:
 for slug,name,title in city.get('spots',[]):
  ident=city['id']+'-'+slug
  if any(p['id']==ident for p in items):continue
  page=pages.get(aliases.get(title,title))
  if not page:
   page=json.loads((R/f'production/world-references/{ident}-page.json').read_text(encoding='utf-8'))
  filename=overrides.get(ident,page.get('pageimage',page.get('pageprops',{}).get('page_image_free')))
  if not filename:raise ValueError(ident)
  pending.append((city,ident,name,page,filename.replace('_',' ')))
infos=w.api('commons.wikimedia.org',action='query',titles='|'.join('File:'+x[4] for x in pending),prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1280)['query']['pages']
byfile={p['title']:p.get('imageinfo',[None])[0] for p in infos}
(R/'production/world-repair-metadata.json').write_text(json.dumps(infos,ensure_ascii=False,indent=2),encoding='utf-8')
for city,ident,name,p,file in pending:
 try:
  info=byfile.get('File:'+file)
  if not info:
   info=w.api('en.wikipedia.org',action='query',titles='File:'+file,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1280)['query']['pages'][0]['imageinfo'][0]
  m=info['extmetadata'];lic=w.clean(m.get('LicenseShortName',{}).get('value',''))
  normalized=lic.replace('-',' ')
  if not (normalized.startswith(('CC BY','CC0')) or 'Public domain' in lic) or any(x in normalized.split() for x in ['NC','ND']):raise ValueError('Unsupported license '+lic)
  c=p['coordinates'][0];target=R/f'production/world-references/{ident}.jpg'
  raw=w.get(info.get('thumburl',info['url']));target.write_bytes(raw)
  with Image.open(target) as im:
   im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((1280,1280));im.save(target,'JPEG',quality=95);im.save(R/f'.local/ComfyUI/input/{ident}.png')
  item=dict(id=ident,cityId=city['id'],name=name,english=p['title'],lat=c['lat'],lng=c['lon'],radius=250,area=city['english'].upper(),description=f'在{name}停下脚步，把{city["name"]}的这一刻留在旅册里。',accent='#547966',image=f'/cards/city-v2/{ident}-landmark.webp',source=info['descriptionurl'],url=info['url'],author=w.clean(m.get('Artist',{}).get('value','')),license=lic,licenseUrl=w.clean(m.get('LicenseUrl',{}).get('value','')),coordinates='https://en.wikipedia.org/wiki/'+urllib.parse.quote(p['title'].replace(' ','_')))
  if ident=='istanbul-galata':item['coordinates']='https://www.wikidata.org/wiki/Q91274'
  # Invalidate only unpublished generated outputs made from a superseded reference.
  prior=next((x for x in items if x['id']==ident),None)
  if prior and prior['source']!=item['source']:
   for category in ['landmark','atmosphere','detail']:
    output=R/f'app/public/cards/city-v2/{ident}-{category}.webp';record=R/f'production/jobs/world-v1-{ident}-{category}.json'
    if output.exists():output.unlink()
    if record.exists():record.write_text('{}',encoding='utf-8')
  items=[x for x in items if x['id']!=ident]+[item];refs.write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8');print('REPAIRED',ident,lic,flush=True)
 except Exception as e:print('FAILED',ident,str(e),flush=True)
 time.sleep(1)
