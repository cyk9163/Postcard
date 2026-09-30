import json,pathlib,importlib.util
r=pathlib.Path('.');spec=importlib.util.spec_from_file_location('p',r/'tools/prepare-world.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
for title in ['Queenstown Gardens','Grossmünster']:
 q=p.api('en.wikipedia.org',action='query',titles=title,prop='images',imlimit=25)['query']['pages'][0];print(title,[x['title'] for x in q.get('images',[])])
