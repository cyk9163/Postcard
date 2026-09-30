"""Publish only complete world content; keep all existing Melbourne IDs and card paths."""
import json,pathlib,argparse,hashlib
R=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--draft',action='store_true');args=p.parse_args()
cities=json.loads((R/'content/world-cities.json').read_text(encoding='utf-8'));refs=json.loads((R/'content/world-references.json').read_text(encoding='utf-8'))
if not args.draft:
 expected={c['id']+'-'+spot[0] for c in cities for spot in c.get('spots',[])}
 assert len(refs)==len(expected) and {x['id'] for x in refs}==expected
 assert len({c['id'] for c in cities})==len(cities)
 for x in refs:
  assert x.get('source') and x.get('author') and x.get('license'),('Missing reference credit',x['id'])
  for c in ['landmark','atmosphere','detail']:
   assert (R/f'app/public/cards/city-v2/{x["id"]}-{c}.webp').is_file(),(x['id'],c)
   job=json.loads((R/f'production/jobs/world-v1-{x["id"]}-{c}.json').read_text())
   assert job.get('status')=='success',('Incomplete generation',x['id'],c)
metadata=[{k:v for k,v in c.items() if k!='spots'} for c in cities]
(R/'app/src/cities.ts').write_text('export const cities='+json.dumps(metadata,ensure_ascii=False,indent=2)+';\nexport function cityById(id:string){const city=cities.find(c=>c.id===id);if(!city)throw Error("找不到这个城市");return city;}\n',encoding='utf-8')
items=[{**{k:v for k,v in x.items() if k in ['id','cityId','name','english','lat','lng','radius','area','description','accent','image']},'credit':x['author']+' / '+x['license']+' '+x['licenseUrl']} for x in refs]
(R/'app/src/world-content.ts').write_text('export const worldPlaces='+json.dumps(items,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
if not args.draft:
 source=R/'app/public/content-sources.json';data=json.loads(source.read_text(encoding='utf-8'));data['version']='world-v1';data['cities']=metadata
 old=[x for x in data['places'] if x['id'] not in {p['id'] for p in refs}]
 for x in data.get('expandedReferences',[]):
  if not any(p['id']==x['id'] for p in old):old.append(x)
 data['cityPack']=f'{len(cities)} cities / {len(old)+len(refs)} places / {(len(old)+len(refs))*3} locally generated reference-guided illustrations'
 for x in refs:
  x['generated']={'model':'FLUX.2 Klein 4B FP8','localOnly':True,'modifications':'Reference photograph transformed locally into three travel illustrations; not a site photograph.','cards':[]}
  for c in ['landmark','atmosphere','detail']:
   path=R/f'app/public/cards/city-v2/{x["id"]}-{c}.webp';x['generated']['cards'].append({'category':c,'image':'/cards/city-v2/'+path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 data['places']=old+refs;source.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
 print('Integrated',len(cities),'cities',len(data['places']),'source records')
