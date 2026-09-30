"""Resolve coordinates and Commons licensing; prepare local reference inputs, resumably."""
import json,pathlib,urllib.request,urllib.parse,time,html,re
from PIL import Image,ImageOps,ImageDraw
R=pathlib.Path(__file__).resolve().parents[1]
UA='ManyouTravelPrototype/0.4 (licensed travel illustration research)'
def get(url):
 for i in range(4):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=45) as f:return f.read()
  except Exception:
   if i==3:raise
   time.sleep(2+i*3)
def api(host,**params):return json.loads(get('https://'+host+'/w/api.php?'+urllib.parse.urlencode(dict(format='json',formatversion=2,**params))))
def clean(s):return html.unescape(re.sub('<[^>]+>','',s or '')).strip()
if __name__=='__main__':
 catalog=json.loads((R/'content/world-cities.json').read_text(encoding='utf-8'))
 dest=R/'content/world-references.json';out=json.loads(dest.read_text(encoding='utf-8')) if dest.exists() else []
 folder=R/'production/world-references';folder.mkdir(exist_ok=True)
 for city in catalog:
  for slug,name,title in city.get('spots',[]):
   ident=city['id']+'-'+slug
   if any(x['id']==ident for x in out):continue
   try:
    p=api('en.wikipedia.org',action='query',titles=title,redirects=1,prop='coordinates|pageimages',piprop='name',pilicense='free')['query']['pages'][0]
    (folder/(ident+'-page.json')).write_text(json.dumps(p,ensure_ascii=False,indent=2),encoding='utf-8')
    coord=p.get('coordinates',[None])[0]
    if not coord:raise ValueError('No coordinates: '+str(p))
    file=p.get('pageimage')
    if not file:raise ValueError('No lead photograph')
    info=api('commons.wikimedia.org',action='query',titles='File:'+file,prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=1280)['query']['pages'][0]['imageinfo'][0]
    meta=info['extmetadata'];lic=clean(meta.get('LicenseShortName',{}).get('value',''))
    if not (lic.startswith(('CC BY','CC0')) or 'Public domain' in lic) or re.search(r'\b(NC|ND)\b',lic):raise ValueError('Unsupported license: '+lic)
    target=folder/(ident+'.jpg')
    raw=get(info.get('thumburl',info['url']));target.write_bytes(raw)
    with Image.open(target) as im:
     im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((1280,1280));im.save(target,'JPEG',quality=95);im.save(R/f'.local/ComfyUI/input/{ident}.png')
    item=dict(id=ident,cityId=city['id'],name=name,english=p['title'],lat=coord['lat'],lng=coord['lon'],radius=250,area=city['english'].upper(),description=f'在{name}停下脚步，把{city["name"]}的这一刻留在旅册里。',accent='#547966',image=f'/cards/city-v2/{ident}-landmark.webp',source=info['descriptionurl'],url=info['url'],author=clean(meta.get('Artist',{}).get('value','')),license=lic,licenseUrl=clean(meta.get('LicenseUrl',{}).get('value','')),coordinates='https://en.wikipedia.org/wiki/'+urllib.parse.quote(p['title'].replace(' ','_')))
    out.append(item);dest.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8');print('READY',ident,lic,flush=True)
   except Exception as e:print('FAILED',ident,str(e),flush=True)
   time.sleep(.5)
 for batch in range((len(out)+11)//12):
  subset=out[batch*12:(batch+1)*12];sheet=Image.new('RGB',(1200,((len(subset)+3)//4)*230),'#eee');draw=ImageDraw.Draw(sheet)
  for i,x in enumerate(subset):
   im=Image.open(folder/(x['id']+'.jpg'));im.thumbnail((295,200));px=i%4*300;py=i//4*230;sheet.paste(im,(px,py));draw.text((px+4,py+204),x['id'],fill='black')
  sheet.save(folder/f'review-{batch}.jpg')
