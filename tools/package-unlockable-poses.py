"""Package reviewed v2 poses without changing already published v1 artwork."""
import pathlib,json,importlib.util,base64,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('agent',root/'tools/generator-agent.py');agent=importlib.util.module_from_spec(spec);spec.loader.exec_module(agent)
records=[]
for actor in ['mira','leo','iris','noah','luna','kai']:
 for pose in ['camera','sit']:
  job=json.loads((root/f'production/jobs/companion-{actor}-{pose}.json').read_text(encoding='utf-8'))
  assert job['status']=='success'
  target=root/f'app/public/companions/v2/{actor}-{pose}.webp';target.parent.mkdir(parents=True,exist_ok=True)
  target.write_bytes(base64.b64decode(agent.cutout(root/job['output']).split(',',1)[1]))
  records.append({'id':actor+'-'+pose,'image':'/companions/v2/'+target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'promptId':job['prompt_id'],'localOnly':True})
path=root/'app/public/companion-sources.json';source=json.loads(path.read_text(encoding='utf-8'));source['unlockableActions']=records;path.write_text(json.dumps(source,indent=2),encoding='utf-8')
print('Packaged 12 unlockable poses.')
