import json,pathlib,importlib.util
r=pathlib.Path('.');spec=importlib.util.spec_from_file_location('p',r/'tools/prepare-world.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
for name in ['world-cities.json','atlas-candidates.json']:
 f=r/'content'/name;cs=json.loads(f.read_text(encoding='utf-8'));next(c for c in cs if c['id']=='chengdu')['spots']=[['jinli','锦里','Jinli']];f.write_text(json.dumps(cs,ensure_ascii=False,indent=2),encoding='utf-8')
f=r/'production/world-references/atlas-overrides.json';o=json.loads(f.read_text());o['perth-swanbells']=o.pop('perth-bells');f.write_text(json.dumps(o))
q=p.api('en.wikipedia.org',action='query',titles='CN Tower',prop='images',imlimit=40)['query']['pages'][0];print([x['title'] for x in q.get('images',[])])
