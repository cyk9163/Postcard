"""Resume the local 5080 reference-guided world card production queue."""
import json,pathlib,importlib.util,time,hashlib
from PIL import Image,ImageDraw
R=pathlib.Path(__file__).resolve().parents[1]
policy=R/'content/production-policy.json'
if policy.exists() and json.loads(policy.read_text(encoding='utf-8')).get('backgroundGenerationPaused'):
 raise SystemExit('Background generation paused: confirm locations, references and character anchors before resuming.')
spec=importlib.util.spec_from_file_location('cards',R/'tools/generate-cards.py');cards=importlib.util.module_from_spec(spec);spec.loader.exec_module(cards)
styles={'landmark':'soft gouache travel illustration in clear morning light. Keep the important landmark fully visible and recognizable','atmosphere':'lyrical watercolor illustration in warm late afternoon light with a peaceful mood. Preserve the architecture and the location','detail':'delicate pencil and watercolor travel sketch. Frame a closer view of a recognizable part of the landmark already visible in the reference, preserve actual shapes. Do not invent objects'}
dest=R/'app/public/cards/city-v2';jobs=R/'production/jobs';start_all=time.time()
guidancePath=R/'content/card-guidance.json';guidance=json.loads(guidancePath.read_text()) if guidancePath.exists() else {}
while True:
 items=json.loads((R/'content/world-references.json').read_text(encoding='utf-8'));worked=False
 for p in items:
  for j,(category,style) in enumerate(styles.items()):
   ident=p['id'];out=dest/f'{ident}-{category}.webp';record=jobs/f'world-v1-{ident}-{category}.json'
   if out.exists() and record.exists():continue
   worked=True;seed=int(hashlib.sha256((ident+category).encode()).hexdigest()[:8],16)
   graph=cards.workflow(ident,seed,style);graph['15']['inputs'].update(width=1024,height=576);graph['16']['inputs'].update(width=1024,height=576)
   graph['8']['inputs']['text']=graph['8']['inputs']['text'].replace('Harmonious forest green, terracotta, soft cream and clear sky colors.','Preserve the actual material colors in the reference, including white marble, colored roofs and natural rock. Do not recolor architecture terracotta.')
   graph['8']['inputs']['text']+=' Wide horizontal landscape composition. Do not include large people or characters in the foreground. No text or labels.'
   if ident in guidance:graph['8']['inputs']['text']='Repaint the reference image as a collectible travel illustration. '+guidance[ident]+' Use '+style+'. Preserve the reference composition and natural colors. Wide landscape format, no lettering or labels.'
   graph['19']['inputs']['filename_prefix']='world-v1/'+ident+'-'+category
   # Reuse an already submitted ID after interruption; never duplicate a running job.
   old=json.loads(record.read_text()) if record.exists() else {}
   pid=old.get('prompt_id')
   if not pid:
    pid=cards.request('/prompt',{'prompt':graph})['prompt_id'];record.write_text(json.dumps({'prompt_id':pid,'workflow':graph,'status':'queued'}),encoding='utf-8')
   start=time.time();print('GENERATING',ident,category,flush=True)
   while time.time()-start<1800:
    result=cards.request('/history/'+pid).get(pid)
    if result:
     if result['status']['status_str']!='success':raise RuntimeError(str(result['status']))
     f=result['outputs']['19']['images'][0];original=R/'.local/ComfyUI/output'/f['subfolder']/f['filename']
     with Image.open(original) as im:im.save(out,'WEBP',quality=88,method=6)
     record.write_text(json.dumps(dict(prompt_id=pid,workflow=graph,status='success',reference=p['source'],license=p['license'],output=str(original.relative_to(R)),elapsedSeconds=round(time.time()-start,2)),indent=2),encoding='utf-8');print('DONE',ident,category,flush=True);break
    time.sleep(2)
   else:raise TimeoutError(pid)
 expected=sum(len(c.get('spots',[])) for c in json.loads((R/'content/world-cities.json').read_text(encoding='utf-8')))
 if len(items)==expected and all((dest/f'{p["id"]}-{c}.webp').exists() for p in items for c in styles):break
 if time.time()-start_all>10800:raise TimeoutError('Waiting for reference preparation')
 if not worked:time.sleep(5)
for batch in range((len(items)+5)//6):
 subset=items[batch*6:(batch+1)*6];sheet=Image.new('RGB',(1200,len(subset)*194),'#eee');draw=ImageDraw.Draw(sheet)
 for i,p in enumerate(subset):
  for j,c in enumerate(['reference',*styles]):
   im=Image.open(R/f'production/world-references/{p["id"]}.jpg' if c=='reference' else dest/f'{p["id"]}-{c}.webp');im.thumbnail((295,165));sheet.paste(im,(j*300,i*194));draw.text((j*300+4,i*194+168),p['id']+' '+c,fill='black')
 sheet.save(R/f'production/world-review-{batch}.jpg')
print('COMPLETE',len(items)*3,'cards',flush=True)
