"""Deterministic sample compositing only; no model or network calls."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import json, shutil, hashlib, zipfile

root=Path(__file__).resolve().parents[1]
out=root/'output/flinders-slot-kit'
background=Image.open(out/'background.png').convert('RGBA')
w,h=background.size
# Measured scene bottom in this generated proof. All coordinates below are normalized to the whole postcard.
slot=(.54,.52,.81,.90)
protected={'main entrance':(.25,.57,.49,.85),'central clock':(.335,.38,.405,.48),'main dome':(.24,.12,.48,.39),'right clock tower':(.87,.45,.955,.78)}
specs=[('mira','小满',.48,.59,.36),('leo','阿澈',.50,.405,.36),('mikan','蜜柑',.79,.50,.32)]
def rect(box):return tuple(round(v*(w if i%2==0 else h)) for i,v in enumerate(box))
metadata={'background':'background.png','backgroundSHA256':hashlib.sha256((out/'background.png').read_bytes()).hexdigest(),'size':[w,h],'coordinateSystem':'normalized to full postcard; top-left origin','slot':{'id':'right-thirds-portrait','faceCenterX':2/3,'cropBaselineY':.90,'allowedBounds':slot,'type':'foreground cropped portrait, not standing in road'},'protectedRegions':protected,'assets':[]}
cards=[]
for key,label,crop_ratio,face_x,display_h in specs:
    source=root/f'app/public/companions/v1/{key}-wave.webp'
    sprite=Image.open(source).convert('RGBA')
    crop=sprite.crop((0,0,sprite.width,round(sprite.height*crop_ratio)))
    crop.save(out/f'{key}-portrait.png')
    scale=h*display_h/crop.height
    size=(round(crop.width*scale),round(crop.height*scale))
    scaled=crop.resize(size,Image.Resampling.LANCZOS)
    x=round(w*2/3-face_x*size[0]);y=round(h*.90)-size[1]
    layer=Image.new('RGBA',(w,h));layer.alpha_composite(scaled,(x,y))
    bounds=layer.getchannel('A').getbbox();allowed=rect(slot)
    assert bounds and bounds[0]>=allowed[0] and bounds[1]>=allowed[1] and bounds[2]<=allowed[2] and bounds[3]<=allowed[3],(key,bounds,allowed)
    for region in protected.values():assert layer.getchannel('A').crop(rect(region)).getbbox() is None
    result=Image.alpha_composite(background,layer)
    outside=ImageChops.difference(result.convert('RGB'),background.convert('RGB'))
    draw=ImageDraw.Draw(outside);draw.rectangle((allowed[0],allowed[1],allowed[2]-1,allowed[3]-1),fill=(0,0,0))
    assert outside.getbbox() is None,'Background changed outside approved slot'
    filename=f'postcard-{key}.png';result.save(out/filename)
    layer.save(out/f'layer-{key}.png')
    metadata['assets'].append({'id':key,'label':label,'source':str(source.relative_to(root)),'portrait':f'{key}-portrait.png','overlay':f'layer-{key}.png','output':filename,'positionPixels':[x,y],'displaySizePixels':list(size),'sourceCropRatio':crop_ratio,'faceAnchorX':face_x,'verified':'No protected-region overlap; identical background pixels outside slot'})
    cards.append((label,result))

fontpath='C:/Windows/Fonts/msyh.ttc'
font=ImageFont.truetype(fontpath,24)
guide=background.copy();d=ImageDraw.Draw(guide)
for region in protected.values():d.rectangle(rect(region),outline='#b7634b',width=4)
d.rectangle(rect(slot),outline='#24684f',width=5)
d.line((round(w*2/3),round(h*.5),round(w*2/3),round(h*.90)),fill='#24684f',width=3)
d.text((round(w*.54),round(h*.485)),'固定半身插槽 · 脸部对齐右三分线',font=font,fill='#143d2f',stroke_width=2,stroke_fill='#fff8e8')
guide.save(out/'slot-guide.png')
thumbw=720;thumbh=round(h/w*thumbw)
sheet=Image.new('RGB',(thumbw*2+60,(thumbh+56)*2+40),'#f4efdf');d=ImageDraw.Draw(sheet)
for i,(label,im) in enumerate([('纯背景 · 只有这一张使用生图',background),*cards]):
    x=20+(i%2)*(thumbw+20);y=20+(i//2)*(thumbh+56)
    sheet.paste(im.convert('RGB').resize((thumbw,thumbh),Image.Resampling.LANCZOS),(x,y));d.text((x,y+thumbh+10),label,font=font,fill='#244437')
sheet.save(out/'comparison.jpg',quality=93)
(out/'slot.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flinders 固定拍照位样张</title><style>body{max-width:1100px;margin:32px auto;padding:0 20px;background:#f5f0e4;color:#244437;font:17px system-ui}button{padding:12px 20px;border:1px solid #a9b6a0;border-radius:24px;background:#fffdf5;margin:4px;cursor:pointer}button[aria-pressed=true]{background:#244437;color:white}.card{position:relative;width:100%}.card img{display:block;width:100%}.overlay{position:absolute;inset:0}p{line-height:1.7}.hint{font-size:14px}</style><h1>同一个拍照位，换一位旅伴</h1><p>右侧三分线附近的半身合影。切换角色只换透明图层，背景、纸边和标题保持原样。</p><nav><button data-id="" aria-pressed="true">纯背景</button><button data-id="mira">小满</button><button data-id="leo">阿澈</button><button data-id="mikan">蜜柑</button></nav><div class="card"><img src="background.png" alt="Flinders 明信片背景"><img class="overlay" id="actor" hidden alt="角色图层" style="display:none"></div><p class="hint">样张沿用旧实景照片视角，尚未验证当前街道状况；现有角色用于验证插槽，画风与透明边缘仍可后续精修。未发布到正式游戏。</p><details><summary>查看插槽与保护区域</summary><img src="slot-guide.png" style="width:100%" alt="绿色插槽，红色禁止遮挡区域"></details><script>document.querySelectorAll('button').forEach(b=>b.onclick=()=>{document.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));const im=document.getElementById('actor');if(b.dataset.id){im.src='layer-'+b.dataset.id+'.png';im.hidden=false;im.style.display='block'}else{im.hidden=true;im.style.display='none'}})</script></html>'''
(out/'index.html').write_text(html,encoding='utf-8')
print('PASS: 3 composites; no overlap with protected landmarks; unchanged pixels outside fixed slot.',background.size)
