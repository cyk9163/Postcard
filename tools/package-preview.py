"""Package the five visually reviewed local illustration candidates for the preview."""
import hashlib,json,pathlib
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
dest=ROOT/'app/public/cards/preview-1';dest.mkdir(parents=True,exist_ok=True)
refs=json.loads((ROOT/'content/references.json').read_text(encoding='utf-8'))
records=[]
for ref in refs:
 place=ref['id'];seed=20260911 if place=='library' else 20260910
 job=json.loads((ROOT/f'production/jobs/{place}-{seed}.json').read_text(encoding='utf-8'))
 if job['status']!='success':raise ValueError('Generation did not succeed')
 output=job['result']['outputs']['19']['images'][0]
 source=ROOT/'.local/ComfyUI/output'/output['subfolder']/output['filename']
 target=dest/f'{place}.webp'
 with Image.open(source) as im:
  im.convert('RGB').save(target,'WEBP',quality=88,method=6)
 record={**ref,'generated':{'image':f'/cards/preview-1/{place}.webp','model':'FLUX.2 Klein 4B FP8','seed':seed,'localOnly':True,'elapsedSeconds':job['elapsed_seconds'],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'status':'visually reviewed for technical preview; creator and on-site review pending','modifications':'Reference photograph transformed into a travel illustration locally. Architecture and details are stylized; not a site photograph.'}}
 if place=='shrine':record['generated']['license']='CC BY-SA 3.0'
 records.append(record)
 print(place,target.stat().st_size,flush=True)
(ROOT/'app/public/content-sources.json').write_text(json.dumps({'version':'melbourne-preview-1','places':records},ensure_ascii=False,indent=2),encoding='utf-8')
