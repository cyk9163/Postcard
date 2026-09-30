"""Generate three independent, reference-guided images per place on the local GPU."""
import json,pathlib,importlib.util,time
from PIL import Image,ImageDraw
R=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('cards',R/'tools/generate-cards.py');cards=importlib.util.module_from_spec(spec);spec.loader.exec_module(cards)
items=json.loads((R/'content/references.json').read_text(encoding='utf-8'))+json.loads((R/'content/expanded-references.json').read_text(encoding='utf-8'))
assert len(items)==20
dest=R/'app/public/cards/city-v2';dest.mkdir(parents=True,exist_ok=True)
styles={'landmark':'soft gouache travel illustration in clear morning light. Keep the main architecture recognizable and the complete important landmark visible', 'atmosphere':'lyrical watercolor illustration in the warm late afternoon after a light rain, with gentle reflections, soft sky, green trees and a peaceful mood. Preserve the same landmark and real architecture', 'detail':'intimate illustrated travel sketch focusing on one recognizable architectural or landscape detail visible in the reference. Close-up framing, fine pencil lines, textured watercolor paper, soft neutral lighting. Do not add invented objects'}
for i,p in enumerate(items):
 for j,(category,style) in enumerate(styles.items()):
  ident=p['id'];out=dest/f'{ident}-{category}.webp';record=R/f'production/jobs/city-v2-{ident}-{category}.json'
  if out.exists() and record.exists():continue
  graph=cards.workflow(ident,2026091500+i*10+j,style);graph['15']['inputs'].update(width=1024,height=576);graph['16']['inputs'].update(width=1024,height=576)
  graph['8']['inputs']['text']+=' Landscape composition, wide horizontal image. Keep all characters out of the foreground. No text or decorative labels.'
  graph['19']['inputs']['filename_prefix']=f'city-v2/{ident}-{category}'
  pid=cards.request('/prompt',{'prompt':graph})['prompt_id'];start=time.time();print('Generating',ident,category,flush=True)
  while time.time()-start<900:
   result=cards.request('/history/'+pid).get(pid)
   if result:
    if result['status']['status_str']!='success':raise RuntimeError(str(result['status']))
    f=result['outputs']['19']['images'][0];original=R/'.local/ComfyUI/output'/f['subfolder']/f['filename'];im=Image.open(original);im.save(out,'WEBP',quality=90,method=6)
    record.write_text(json.dumps(dict(prompt_id=pid,workflow=graph,reference=p['source'],license=p['license'],output=str(original.relative_to(R)),elapsedSeconds=round(time.time()-start,2)),indent=2),encoding='utf-8');break
   time.sleep(2)
  else:raise TimeoutError(pid)
for batch in range(4):
 subset=items[batch*5:(batch+1)*5];sheet=Image.new('RGB',(900,len(subset)*188),'#eee');draw=ImageDraw.Draw(sheet)
 for i,p in enumerate(subset):
  for j,c in enumerate(styles):
   im=Image.open(dest/f'{p["id"]}-{c}.webp');im.thumbnail((294,165));sheet.paste(im,(j*300,i*188));draw.text((j*300+5,i*188+168),p['id']+' '+c,fill='black')
 sheet.save(R/f'production/city-review-{batch}.jpg')
