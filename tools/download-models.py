import argparse,hashlib,json,pathlib,shutil,time,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
template=ROOT/'.local/comfy-env/Lib/site-packages/comfyui_workflow_templates_json/templates/image_flux2_klein_image_edit_4b_distilled.json'
data=json.loads(template.read_text(encoding='utf-8'))
workflows=ROOT/'production/workflows';workflows.mkdir(parents=True,exist_ok=True)
shutil.copy2(template,workflows/'official-klein-4b-edit.json')
models=data['definitions']['subgraphs'][0]['nodes']
parser=argparse.ArgumentParser();parser.add_argument('--only');args=parser.parse_args()
record_path=workflows/'downloaded-models.json'
records=json.loads(record_path.read_text(encoding='utf-8')) if record_path.exists() else []
for node in models:
 for model in node.get('properties',{}).get('models',[]):
  if args.only and args.only not in model['name']:continue
  target=ROOT/'.local/ComfyUI/models'/model['directory']/model['name'];target.parent.mkdir(parents=True,exist_ok=True)
  if target.exists(): print('Already downloaded',model['name'],flush=True);continue
  part=target.with_suffix('.partial');offset=part.stat().st_size if part.exists() else 0
  headers={'User-Agent':'Postcard-local-MVP/0.1'}
  if offset:headers['Range']=f'bytes={offset}-'
  req=urllib.request.Request(model['url'],headers=headers)
  print('Downloading',model['name'],flush=True)
  with urllib.request.urlopen(req,timeout=45) as response:
   append=offset>0 and response.status==206
   if not append:offset=0
   total=int(response.headers.get('Content-Length',0))+offset;received=offset;last=time.time()
   with part.open('ab' if append else 'wb') as out:
    while chunk:=response.read(4*1024*1024):
     out.write(chunk);received+=len(chunk)
     if time.time()-last>15:print(f'{model["name"]}: {received/1e9:.2f}/{total/1e9:.2f} GB',flush=True);last=time.time()
  if total and received!=total:raise ValueError('Incomplete model')
  part.rename(target)
  digest=hashlib.file_digest(target.open('rb'),'sha256').hexdigest()
  current=json.loads(record_path.read_text(encoding='utf-8')) if record_path.exists() else []
  current=[r for r in current if r['name']!=model['name']]+[{**model,'bytes':received,'sha256':digest}]
  record_path.write_text(json.dumps(current,indent=2),encoding='utf-8')
  print('Ready',model['name'],flush=True)
