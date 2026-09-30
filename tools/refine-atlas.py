"""Correct landmark-specific architectural drift found during visual QA, locally."""
import json,pathlib,importlib.util,time,hashlib,argparse
from PIL import Image
R=pathlib.Path(__file__).resolve().parents[1]
policy=R/'content/production-policy.json'
if policy.exists() and json.loads(policy.read_text(encoding='utf-8')).get('backgroundGenerationPaused'):
 raise SystemExit('Background generation paused: confirm locations, references and character anchors before resuming.')
spec=importlib.util.spec_from_file_location('cards',R/'tools/generate-cards.py');cards=importlib.util.module_from_spec(spec);spec.loader.exec_module(cards)
notes={'milan-duomo':'Milan Cathedral has pale white and light grey marble walls and delicate white Gothic spires. Preserve its marble colors. No red brick walls.', 'helsinki-cathedral':'Helsinki Cathedral is bright WHITE neoclassical architecture with a green central dome and four smaller green domes. WHITE walls and WHITE columns, not red brick. Preserve the white facade.', 'vienna-schonbrunn':'Schonbrunn Palace is a long, low, symmetrical yellow baroque palace. Preserve the low flat roof silhouette exactly. No tall central tower, no clock tower, no church steeple.'}
notes['jeju-samseong']='Samseonghyeol sacred grove: preserve the grassy ground with three shallow natural holes surrounded by short stone fence posts and tall old trees. No temple buildings in the clearing, no palace, no new architecture. The open grassy ground is the main subject.'
notes['cape-town-table']='Table Mountain seen across the ocean from the sandy beach. The flat-topped sandstone mountain is a natural rocky formation, NOT a fortress or buildings. Preserve the mountain silhouette and ocean. No towers, no castles, no domes, no structures on the mountain.'
notes['abu-dhabi-mosque']='Sheikh Zayed Grand Mosque: all domes, walls, columns and minarets are bright WHITE marble. Preserve the white domes and white marble courtyard. No gold domes, no orange or red architecture. Preserve the reference buildings and courtyard precisely.'
styles={'landmark':'soft gouache illustration in clear morning daylight','atmosphere':'gentle watercolor illustration in soft afternoon light','detail':'delicate pencil and watercolor architectural sketch'}
parser=argparse.ArgumentParser();parser.add_argument('--only',nargs='+');args=parser.parse_args()
guidancePath=R/'content/card-guidance.json'
if guidancePath.exists():notes.update(json.loads(guidancePath.read_text()))
if args.only:notes={k:v for k,v in notes.items() if k in args.only}
refs={p['id']:p for p in json.loads((R/'content/world-references.json').read_text(encoding='utf-8'))}
for ident,note in notes.items():
 for category,style in styles.items():
  record=R/f'production/jobs/atlas-refine-{ident}-{category}.json'
  if record.exists() and json.loads(record.read_text()).get('status')=='success':continue
  graph=cards.workflow(ident,int(hashlib.sha256((ident+category).encode()).hexdigest()[:8],16),style)
  graph['8']['inputs']['text']='Repaint the reference photograph as a collectible travel illustration. '+note+' Use '+style+'. Preserve exact structures and recognizable proportions. Faithful natural materials and colors. Wide landscape composition, no foreground characters, no text or labels.'
  for n in ['15','16']:graph[n]['inputs'].update(width=1024,height=576)
  graph['19']['inputs']['filename_prefix']='atlas-refined/'+ident+'-'+category
  old=json.loads(record.read_text()) if record.exists() else {};pid=old.get('prompt_id') or cards.request('/prompt',{'prompt':graph})['prompt_id']
  record.write_text(json.dumps({'prompt_id':pid,'status':'queued','workflow':graph}));print('REFINING',ident,category,flush=True)
  start=time.time()
  while time.time()-start<1800:
   result=cards.request('/history/'+pid).get(pid)
   if result:
    assert result['status']['status_str']=='success',result['status']
    f=result['outputs']['19']['images'][0];original=R/'.local/ComfyUI/output'/f['subfolder']/f['filename'];out=R/f'app/public/cards/city-v2/{ident}-{category}.webp'
    with Image.open(original) as im:im.save(out,'WEBP',quality=88,method=6)
    data={'prompt_id':pid,'status':'success','workflow':graph,'reference':refs[ident]['source'],'license':refs[ident]['license'],'output':str(original.relative_to(R))}
    record.write_text(json.dumps(data));(R/f'production/jobs/world-v1-{ident}-{category}.json').write_text(json.dumps(data));print('REFINED',ident,category,flush=True);break
   time.sleep(2)
  else:raise TimeoutError(pid)
