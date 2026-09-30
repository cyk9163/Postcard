import json,pathlib,importlib.util
r=pathlib.Path('.');spec=importlib.util.spec_from_file_location('p',r/'tools/prepare-world.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
f=r/'production/world-references/atlas-pages.json';pages=json.loads(f.read_text())
alts={'Wuhou Shrine':'Wuhou Shrine (Chengdu)','Dragon Bridge, Da Nang':'Dragon Bridge (Da Nang)','Taman Sari, Yogyakarta':'Taman Sari (Yogyakarta)','Bellagio, Las Vegas':'Bellagio (resort)','Christ the Redeemer, Rio de Janeiro':'Christ the Redeemer (statue)','Sky Tower, Auckland':'Sky Tower (Auckland)','Beehive, New Zealand':'Beehive (New Zealand)'}
q=p.api('en.wikipedia.org',action='query',titles='|'.join(alts.values()),redirects=1,prop='coordinates|pageimages|pageprops',piprop='name',pilicense='free')['query']
aliases={x['from']:x['to'] for k in ['normalized','redirects'] for x in q.get(k,[])}
for original,title in alts.items():
 while title in aliases:title=aliases[title]
 v=next((v for v in q['pages'] if v['title']==title),{})
 pages[original]=v;print(original, v.get('pageimage'),v.get('coordinates'))
f.write_text(json.dumps(pages))
