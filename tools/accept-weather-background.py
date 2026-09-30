"""Record a visually checked weather edit and make slot proofs; no image model/API."""
import json,shutil,sys,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
R=Path(__file__).resolve().parents[1];D=R/'production/weather-backgrounds-v1';O=R/'output/weather-backgrounds-v1';O.mkdir(exist_ok=True)
key,uid=sys.argv[1:3];path=D/'batch.json';b=json.loads(path.read_text(encoding='utf-8'));item=next(i for i in b['items'] if i['id']==key)
assert not item['published'],'Use a new version for published assets'
source=Path('C:/Users/yc/.codex/generated_images/01a089fd-e5cb-7141-8fea-ce0f6b31c719')/f'exec-{uid}.png'
target=D/f'{key}.png';shutil.copyfile(source,target)
bg=Image.open(target).convert('RGBA');w,h=bg.size;s=item['slot'];original=Image.open(R/item['source'])
assert abs(w/h-original.width/original.height)<.025,'Aspect ratio changed'
dest=O/key;dest.mkdir(exist_ok=True);bg.convert('RGB').save(dest/'background.webp',quality=92)
rect=lambda bounds:tuple(round(v*(w if j%2==0 else h)) for j,v in enumerate(bounds))
guide=bg.copy();draw=ImageDraw.Draw(guide);draw.rectangle(rect(s['bounds']),outline='#237644',width=4)
for p in s['protected']:draw.rectangle(rect(p),outline='#b84b3f',width=4)
guide.convert('RGB').save(dest/'slot-guide.jpg',quality=88)
variants=[]
for actorid,ratio,face in [('mira',.48,.59),('leo',.50,.405),('mikan',.79,.50)]:
 actor=Image.open(R/f'app/public/companions/v1/{actorid}-wave.webp').convert('RGBA')
 portrait=s['type']=='portrait'
 if portrait:actor=actor.crop((0,0,actor.width,round(actor.height*ratio)))
 scale=h*s['petHeight' if actorid=='mikan' else 'humanHeight']/actor.height
 actor=actor.resize((round(actor.width*scale),round(actor.height*scale)),Image.Resampling.LANCZOS)
 pos=(round(w*s['x']-actor.width*(face if portrait else .5)),round(h*s['bottom'])-actor.height)
 layer=Image.new('RGBA',bg.size);layer.alpha_composite(actor,pos);alpha=layer.getchannel('A');bounds=alpha.getbbox();allowed=rect(s['bounds'])
 assert bounds and bounds[0]>=allowed[0] and bounds[1]>=allowed[1] and bounds[2]<=allowed[2] and bounds[3]<=allowed[3],(key,actorid,'outside slot')
 for p in s['protected']:assert alpha.crop(rect(p)).getbbox() is None,(key,actorid,'protected overlap')
 result=Image.alpha_composite(bg,layer);diff=ImageChops.difference(result.convert('RGB'),bg.convert('RGB'));ImageDraw.Draw(diff).rectangle((allowed[0],allowed[1],allowed[2]-1,allowed[3]-1),fill=0);assert diff.getbbox() is None
 result.convert('RGB').save(dest/f'{actorid}.jpg',quality=90);variants.append((actorid,result))
tw=650;th=round(h/w*tw);sheet=Image.new('RGB',(tw*2+60,(th+40)*2+40),'#f8f1e3');draw=ImageDraw.Draw(sheet);font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',21)
for j,(label,im) in enumerate([('纯背景',bg),*variants]):
 x=20+(j%2)*(tw+20);y=20+(j//2)*(th+40);sheet.paste(im.convert('RGB').resize((tw,th)),(x,y));draw.text((x,y+th+5),label,font=font,fill='#254639')
sheet.save(dest/'comparison.jpg',quality=88)
(dest/'slot.json').write_text(json.dumps(s,ensure_ascii=False,indent=2),encoding='utf-8')
item.update(status='generated-reviewed',generatedSource=target.relative_to(R).as_posix(),output=(dest/'background.webp').relative_to(R).as_posix(),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),generatorOutput=str(source))
path.write_text(json.dumps(b,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(f'Accepted {key}; {sum(i["status"]=="generated-reviewed" for i in b["items"])}/392')
