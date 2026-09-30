import pathlib,json,importlib.util
r=pathlib.Path('.');spec=importlib.util.spec_from_file_location('p',r/'tools/prepare-world.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
q=p.api('commons.wikimedia.org',action='query',titles='File:Jingli.jpeg',prop='revisions',rvprop='content',rvslots='main');print(json.dumps(q))
