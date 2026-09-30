"""Run the project's local-only ComfyUI reference-image workflow. No cloud API."""
import argparse,json,pathlib,time,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL='http://127.0.0.1:8188'
def request(path,data=None):
 req=urllib.request.Request(URL+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=120) as r:return json.load(r)
def workflow(place,seed,style):
 prompt=('Transform the reference photograph into a beautiful collectible travel postcard illustration. '
  'Preserve the exact recognizable architecture, proportions, composition, and important structures of the reference. '
  'Use '+style+'. Harmonious forest green, terracotta, soft cream and clear sky colors. '
  'Elegant travel journal artwork, atmospheric natural light, warm inviting mood. '
  'Keep the scene geographically faithful. Do not add buildings or invented architectural features. '
  'No lettering, no captions, no border, no logos. Full-bleed image.')
 return {
  '1':{'class_type':'UNETLoader','inputs':{'unet_name':'flux-2-klein-4b-fp8.safetensors','weight_dtype':'default'}},
  '2':{'class_type':'CLIPLoader','inputs':{'clip_name':'qwen_3_4b.safetensors','type':'flux2','device':'default'}},
  '3':{'class_type':'VAELoader','inputs':{'vae_name':'flux2-vae.safetensors'}},
  '4':{'class_type':'LoadImage','inputs':{'image':place+'.png'}},
  '5':{'class_type':'ImageScaleToTotalPixels','inputs':{'image':['4',0],'upscale_method':'lanczos','megapixels':0.7,'resolution_steps':64}},
  '6':{'class_type':'GetImageSize','inputs':{'image':['5',0]}},
  '7':{'class_type':'VAEEncode','inputs':{'pixels':['5',0],'vae':['3',0]}},
  '8':{'class_type':'CLIPTextEncode','inputs':{'clip':['2',0],'text':prompt}},
  '9':{'class_type':'ConditioningZeroOut','inputs':{'conditioning':['8',0]}},
  '10':{'class_type':'ReferenceLatent','inputs':{'conditioning':['8',0],'latent':['7',0]}},
  '11':{'class_type':'ReferenceLatent','inputs':{'conditioning':['9',0],'latent':['7',0]}},
  '12':{'class_type':'CFGGuider','inputs':{'model':['1',0],'positive':['10',0],'negative':['11',0],'cfg':1}},
  '13':{'class_type':'RandomNoise','inputs':{'noise_seed':seed}},
  '14':{'class_type':'KSamplerSelect','inputs':{'sampler_name':'euler'}},
  '15':{'class_type':'Flux2Scheduler','inputs':{'steps':4,'width':['6',0],'height':['6',1]}},
  '16':{'class_type':'EmptyFlux2LatentImage','inputs':{'width':['6',0],'height':['6',1],'batch_size':1}},
  '17':{'class_type':'SamplerCustomAdvanced','inputs':{'noise':['13',0],'guider':['12',0],'sampler':['14',0],'sigmas':['15',0],'latent_image':['16',0]}},
  '18':{'class_type':'VAEDecode','inputs':{'samples':['17',0],'vae':['3',0]}},
  '19':{'class_type':'SaveImage','inputs':{'images':['18',0],'filename_prefix':f'postcard/{place}-{seed}'}},
 }
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--places',nargs='+',default=['flinders']);p.add_argument('--seed',type=int,default=20260910);p.add_argument('--style',default='painterly gouache brushwork and subtle printed paper grain, simplified clean shapes with carefully retained architectural detail');args=p.parse_args()
 jobs=ROOT/'production/jobs';jobs.mkdir(parents=True,exist_ok=True)
 for place in args.places:
  if place not in ['flinders','federation','gardens','shrine','library']:raise ValueError('Unsupported place')
  graph=workflow(place,args.seed,args.style);start=time.time();response=request('/prompt',{'prompt':graph,'client_id':'postcard-local-production'})
  prompt_id=response['prompt_id'];print('Queued',place,prompt_id,flush=True)
  record={'place':place,'prompt_id':prompt_id,'seed':args.seed,'style':args.style,'workflow':graph,'status':'running'}
  target=jobs/f'{place}-{args.seed}.json';target.write_text(json.dumps(record,indent=2),encoding='utf-8')
  while True:
   history=request('/history/'+prompt_id)
   if prompt_id in history:
    item=history[prompt_id];record.update({'elapsed_seconds':round(time.time()-start,2),'result':item,'status':item.get('status',{}).get('status_str')})
    target.write_text(json.dumps(record,indent=2),encoding='utf-8');print(place,record['status'],record['elapsed_seconds'],flush=True)
    if record['status']!='success':raise RuntimeError(json.dumps(item.get('status')))
    break
   if time.time()-start>1800:raise TimeoutError('Job still running; inspect saved prompt ID before retrying')
   time.sleep(3)
