import hashlib,json,pathlib,urllib.request
from PIL import Image,ImageDraw,ImageOps
ROOT=pathlib.Path(__file__).resolve().parents[1]
refs=json.loads((ROOT/'content/references.json').read_text(encoding='utf-8'))
target=ROOT/'production/references';target.mkdir(parents=True,exist_ok=True)
comfy=ROOT/'.local/ComfyUI/input';comfy.mkdir(parents=True,exist_ok=True)
for ref in refs:
 dest=target/(ref['id']+'.jpg')
 try:
  if not dest.exists():
   req=urllib.request.Request(ref['url'],headers={'User-Agent':'PostcardMVP/0.1 (local educational prototype; reference download)'})
   with urllib.request.urlopen(req,timeout=60) as r:dest.write_bytes(r.read())
  with Image.open(dest) as im:
   im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((1152,1152));im.save(comfy/(ref['id']+'.png'))
   print(ref['id'],im.size,flush=True)
  ref['sha256']=hashlib.file_digest(dest.open('rb'),'sha256').hexdigest();ref['downloadedAt']='2026-09-10'
 except Exception as exc:print(ref['id'],'DOWNLOAD FAILED',str(exc),flush=True)
public=ROOT/'app/public';(public/'icons').mkdir(parents=True,exist_ok=True)
for size,filename in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png')]:
 im=Image.new('RGB',(size,size),'#174a3e');draw=ImageDraw.Draw(im);w=size//3
 draw.rounded_rectangle((size*.2,size*.3,size*.8,size*.7),radius=size*.025,outline='#fff8e8',width=max(2,size//40))
 draw.line([(size*.21,size*.32),(size*.5,size*.53),(size*.79,size*.32)],fill='#fff8e8',width=max(2,size//40))
 im.save(public/'icons'/filename)
(public/'content-sources.json').write_text(json.dumps({'status':'reference photos; generated cards require review','model':'FLUX.2 klein 4B','references':refs},ensure_ascii=False,indent=2),encoding='utf-8')
