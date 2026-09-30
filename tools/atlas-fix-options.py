import json,pathlib,importlib.util
r=pathlib.Path('.');spec=importlib.util.spec_from_file_location('p',r/'tools/prepare-world.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
f=r/'production/world-references/atlas-overrides.json';o=json.loads(f.read_text());files={'prague-charles':'Charles Bridge (Karlův most), Vltava River, Prague, 2015.jpg','las-vegas-bellagio':'Bellagio Fountains at night.jpg','chicago-cloudgate':"Cloud Gate (The Bean) from east'.jpg",'perth-bells':'Perth Swan Bells Tower b.jpg'}
cs=json.loads((r/'content/atlas-candidates.json').read_text(encoding='utf-8'))
for c in cs:
 if c['id'] in ['las-vegas','chicago','perth','chengdu']:print(c)
for ident,file in files.items():o.setdefault(ident,{})['file']=file
f.write_text(json.dumps(o))
q=p.api('en.wikipedia.org',action='query',titles='Jinli|Wuhou Shrine|Wuhou Memorial Temple',redirects=1,prop='coordinates|pageimages|pageprops',piprop='name')['query'];print(q)
