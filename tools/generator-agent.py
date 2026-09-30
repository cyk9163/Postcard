"""Authenticated, outbound-only local GPU worker. Never exposes ComfyUI to the internet."""
import os,json,time,urllib.request,urllib.error,importlib.util,base64,io,pathlib,hashlib
import numpy as np
from PIL import Image
from scipy.ndimage import binary_propagation,label
R=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('cards',R/'tools/generate-cards.py');cards=importlib.util.module_from_spec(spec);spec.loader.exec_module(cards)
def cutout(path):
 im=Image.open(path).convert('RGB');rgb=np.array(im);mask=(rgb.min(axis=2)>235)&(rgb.max(axis=2).astype(int)-rgb.min(axis=2)<26)
 seed=np.zeros(mask.shape,dtype=bool);seed[0]=mask[0];seed[-1]=mask[-1];seed[:,0]=mask[:,0];seed[:,-1]=mask[:,-1]
 foreground=~binary_propagation(seed,mask=mask);labels,n=label(foreground);sizes=np.bincount(labels.ravel());sizes[0]=0;foreground=labels==sizes.argmax()
 result=Image.fromarray(np.dstack((rgb,foreground.astype('uint8')*255)));box=result.getbbox()
 if not box:raise ValueError('No character found in generated image')
 result=result.crop(box);result.thumbnail((700,1000));b=io.BytesIO();result.save(b,'WEBP',quality=90);return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
def generate(job):
 seed=int(hashlib.sha256(job['id'].encode()).hexdigest()[:10],16);graph=cards.workflow('agent-'+job['id'],seed,'watercolor anime')
 if job.get('reference'):
  data=base64.b64decode(job['reference'].split(',',1)[1]);im=Image.open(io.BytesIO(data)).convert('RGBA');back=Image.new('RGBA',im.size,'white');back.alpha_composite(im);back.convert('RGB').save(R/f'.local/ComfyUI/input/agent-{job["id"]}.png')
 else:
  for n in ['4','5','6','7','10','11']:del graph[n]
  graph['12']['inputs'].update(positive=['8',0],negative=['9',0]);graph['15']['inputs'].update(width=640,height=896);graph['16']['inputs'].update(width=640,height=896)
 subject='one adult human traveler' if job['kind']=='human' else 'one friendly pet animal'
 graph['8']['inputs']['text']=f'Create a single isolated full body sticker of {subject}. Character description: {job["prompt"]}. Gentle anime watercolor, clean outlines, anatomy correct, exactly one subject. Full body visible with generous white margins. Solid pure white background, no environment, no captions. '+('Preserve exactly the face, hair, clothes, colors and identity from the reference, only change the requested pose.' if job.get('reference') else '')
 graph['19']['inputs']['filename_prefix']='agent/'+job['id'];pid=cards.request('/prompt',{'prompt':graph})['prompt_id'];start=time.time()
 while time.time()-start<720:
  result=cards.request('/history/'+pid).get(pid)
  if result:
   if result['status']['status_str']!='success':raise RuntimeError('Local image generation failed')
   out=result['outputs']['19']['images'][0];return cutout(R/'.local/ComfyUI/output'/out['subfolder']/out['filename'])
  time.sleep(2)
 raise TimeoutError('Generation timed out; please retry')
def main():
 url=os.environ['MANYOU_URL'].rstrip('/');token=os.environ['MANYOU_GENERATOR_TOKEN']
 if not (url.startswith('https://') or url.startswith('http://127.0.0.1:')):raise ValueError('HTTPS is required for a remote server')
 def api(route,payload):
  req=urllib.request.Request(url+'/api/agent/'+route,data=json.dumps(payload).encode(),headers={'User-Agent':'manyou-local-generator/0.3','Content-Type':'application/json','Authorization':'Bearer '+token})
  with urllib.request.urlopen(req,timeout=45) as f:return json.load(f)
 print('Local generator ready. Keep ComfyUI running. Ctrl+C stops the worker.',flush=True)
 while True:
  try:
   # Do not lease a user's job while the local model server is starting.
   cards.request('/system_stats')
   job=api('next',{})['job']
   if not job:time.sleep(15);continue
   print('Working on',job['id'],flush=True)
   try:payload={'id':job['id'],'lease':job['lease'],'image':generate(job)}
   except Exception as e:payload={'id':job['id'],'lease':job['lease'],'error':str(e)[:300]}
   api('result',payload);print('Result uploaded',job['id'],flush=True)
  except urllib.error.HTTPError as e:
   if e.code==401:raise RuntimeError('Connection code expired or revoked. Pair again.')
   print('Server unavailable, retrying shortly.',flush=True);time.sleep(30)
  except (urllib.error.URLError,TimeoutError):print('Connection interrupted; retrying.',flush=True);time.sleep(30)
if __name__=='__main__':main()
