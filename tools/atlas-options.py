import pathlib,json,importlib.util,urllib.parse
r=pathlib.Path('.');spec=importlib.util.spec_from_file_location('p',r/'tools/prepare-world.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
f=r/'production/world-references/atlas-overrides.json';o=json.loads(f.read_text()) if f.exists() else {}
u='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode(dict(action='wbgetentities',ids='Q1849491|Q931733',props='claims',format='json'))
d=json.loads(p.get(u))['entities']
for ident,qid in [('nice-promenade','Q1849491'),('dubrovnik-walls','Q931733')]:
 v=d[qid]['claims']['P625'][0]['mainsnak']['datavalue']['value'];o[ident]={'coord':{'lat':v['latitude'],'lon':v['longitude']}}
f.write_text(json.dumps(o))
titles=['Charles Bridge','Bellagio (resort)','Cloud Gate','Swan Bells','Wuhou Temple']
for title in titles:
 q=p.api('en.wikipedia.org',action='query',titles=title,redirects=1,prop='images|coordinates|pageimages',imlimit=30,piprop='name')['query']['pages'][0]
 (r/'production/world-references'/('candidates-'+title.split()[0]+'.json')).write_text(json.dumps(q));print(title,[(x['title']) for x in q.get('images',[])])
