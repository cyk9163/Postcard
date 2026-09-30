"""Correct review findings: keep interiors indoors, avoid invented water, make detail cards close-ups."""
import json,pathlib,importlib.util,time,shutil
from PIL import Image,ImageDraw
R=pathlib.Path(__file__).resolve().parents[1];spec=importlib.util.spec_from_file_location('cards',R/'tools/generate-cards.py');cards=importlib.util.module_from_spec(spec);spec.loader.exec_module(cards)
items=json.loads((R/'content/references.json').read_text(encoding='utf-8'))+json.loads((R/'content/expanded-references.json').read_text(encoding='utf-8'))
for i,p in enumerate(items):
 for cat in (['landmark','atmosphere','detail'] if p['id']=='library' else ['atmosphere','detail']):
  ident=p['id'];target=R/f'app/public/cards/city-v2/{ident}-{cat}.webp';record=R/f'production/jobs/city-v2-{ident}-{cat}.json';done=R/f'production/jobs/city-v2-refined-{ident}-{cat}.json'
  if done.exists():continue
  source=Image.open(R/f'.local/ComfyUI/input/{ident}.png').convert('RGB');w,h=source.size
  if cat=='detail':
   box=(.18,.22,.72,.70)
   if ident=='library':box=(.00,.43,.44,.75)
   if ident=='flinders':box=(.25,.05,.70,.48)
   source=source.crop(tuple(int(v*(w if k%2==0 else h)) for k,v in enumerate(box)))
  source.save(R/f'.local/ComfyUI/input/refine-{ident}.png')
  graph=cards.workflow('refine-'+ident,2026092200+i*10+(['landmark','atmosphere','detail'].index(cat)),'gentle watercolor travel sketch')
  graph['15']['inputs'].update(width=1024,height=576);graph['16']['inputs'].update(width=1024,height=576)
  wording='warm late afternoon light, soft pastel watercolor, subtle paper grain' if cat=='atmosphere' else 'fine ink drawing with watercolor shading and visible material textures' if cat=='detail' else 'warm elegant gouache with precise architectural details'
  graph['8']['inputs']['text']='Convert this exact reference image to a collectible illustrated postcard, '+wording+'. Preserve the exact physical setting and all important objects of the reference. Do not add any trees, plants, water, lake, reflection pool, buildings, windows or objects not present in the reference. No foreground people, no text, no caption. '+('This is an INDOOR LIBRARY READING ROOM: all the long horizontal dark areas are shelves filled with many red, brown and black BOOK SPINES. Preserve all shelves and book rows. White interior walls, balcony railings, no outdoors, no trees, no sky.' if ident=='library' else '')+(' This is a close-up detail study: preserve the cropped framing. Do not zoom out or rebuild a whole building.' if cat=='detail' else '')
  graph['19']['inputs']['filename_prefix']=f'city-v2-refined/{ident}-{cat}';pid=cards.request('/prompt',{'prompt':graph})['prompt_id'];start=time.time();print('Refining',ident,cat,flush=True)
  while time.time()-start<900:
   result=cards.request('/history/'+pid).get(pid)
   if result:
    if result['status']['status_str']!='success':raise RuntimeError(str(result['status']))
    f=result['outputs']['19']['images'][0];original=R/'.local/ComfyUI/output'/f['subfolder']/f['filename'];Image.open(original).save(target,'WEBP',quality=90,method=6);done.write_text(json.dumps(dict(prompt_id=pid,workflow=graph,output=str(original.relative_to(R)),supersedes=str(record.relative_to(R)),reason='Corrected geography and indoor setting; detail cards use cropped source'),indent=2),encoding='utf-8');break
   time.sleep(2)
for batch in range(4):
 sheet=Image.new('RGB',(900,940),'#eee');draw=ImageDraw.Draw(sheet)
 for i,p in enumerate(items[batch*5:(batch+1)*5]):
  for j,c in enumerate(['landmark','atmosphere','detail']):
   im=Image.open(R/f'app/public/cards/city-v2/{p["id"]}-{c}.webp');im.thumbnail((294,165));sheet.paste(im,(j*300,i*188));draw.text((j*300+5,i*188+168),p['id']+' '+c,fill='black')
 sheet.save(R/f'production/city-refined-review-{batch}.jpg')
