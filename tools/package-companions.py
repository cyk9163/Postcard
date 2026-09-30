"""Convert the reviewed white-background local stickers to transparent, versioned WebP."""
import hashlib,json,pathlib
import numpy as np
from PIL import Image
from scipy.ndimage import binary_propagation,binary_fill_holes,label
ROOT=pathlib.Path(__file__).resolve().parents[1]
target=ROOT/'app/public/companions/v1';target.mkdir(parents=True,exist_ok=True)
records=[]
for identity in ['mira','leo','iris','noah','luna','kai','mikan','mugi']:
 for pose in ['stand','wave']:
  job=json.loads((ROOT/f'production/jobs/companion-{identity}-{pose}.json').read_text(encoding='utf-8'))
  assert job['status']=='success'
  im=Image.open(ROOT/job['output']).convert('RGB');rgb=np.array(im)
  nearwhite=(rgb.min(axis=2)>238)&((rgb.max(axis=2).astype(int)-rgb.min(axis=2))<22)
  seed=np.zeros(nearwhite.shape,dtype=bool);seed[0,:]=nearwhite[0,:];seed[-1,:]=nearwhite[-1,:];seed[:,0]=nearwhite[:,0];seed[:,-1]=nearwhite[:,-1]
  background=binary_propagation(seed,mask=nearwhite)
  foreground=~background
  labels,n=label(foreground);sizes=np.bincount(labels.ravel());sizes[0]=0
  # Only the subject and its connected outline are kept, removing stray marks outside it.
  foreground=labels==int(sizes.argmax());rgba=np.dstack((rgb,foreground.astype('uint8')*255))
  result=Image.fromarray(rgba);bounds=result.getbbox();assert bounds
  result=result.crop((max(0,bounds[0]-6),max(0,bounds[1]-6),min(im.width,bounds[2]+6),min(im.height,bounds[3]+6)))
  result.thumbnail((700,1000));path=target/f'{identity}-{pose}.webp';result.save(path,'WEBP',quality=92,method=6)
  records.append({'id':f'{identity}-{pose}-v1','image':f'/companions/v1/{path.name}','model':'FLUX.2 Klein 4B FP8','localOnly':True,'promptId':job['prompt_id'],'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'processing':'Removed edge-connected white background and disconnected marks; alpha preserved. Initial generated prototype art; final user assets pending.'})
  print(identity,pose,result.size,flush=True)
(ROOT/'app/public/companion-sources.json').write_text(json.dumps({'version':1,'assets':records},indent=2),encoding='utf-8')
