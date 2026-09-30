"""Create deterministic slot proofs and an honest progress document. No network/model."""
from pathlib import Path
import json, hashlib, html
from PIL import Image, ImageDraw, ImageFont, ImageChops

R = Path(__file__).resolve().parents[1]
D = R / 'production/chat-backgrounds-v1'
O = R / 'output/chat-backgrounds-v1'
O.mkdir(parents=True, exist_ok=True)
batch = json.loads((D/'batch.json').read_text(encoding='utf-8'))
slots = json.loads((D/'reviewed-slots.json').read_text(encoding='utf-8'))
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 23)
report = ['# 主卡面更新与人物位置说明', '', '目标：196 个景点各一张主卡面。按每项上线状态区分已发布与待制作，未完成项仍列在末尾。', '', '生成方式：聊天内置生图；人物、宠物预览使用现有透明贴图，普通本地合成，无生图调用。', '', '坐标以纯背景左上角为 (0,0)，右下角为 (1,1)。横坐标乘图片宽，纵坐标乘图片高，即为像素位置。全身以脚底对齐；半身以画面下边缘裁切，不能解释为站在道路或水面。', '', '保护框验证构图遮挡，不能证明每个建筑细节真实。参考照片不一定是当前街道状态。网页会按完整贴图外接框缩小过宽角色，以免道具越界；未经单独标注的自定义人物无法保证脸部位置和半身裁切恰到好处。', '']
sections = []
for item in batch['items']:
    pid = item['placeId']
    if pid not in slots:
        continue
    s = slots[pid]
    bg = Image.open(D/f'{pid}.png').convert('RGBA')
    w,h = bg.size
    rect = lambda b: tuple(round(v*(w if i%2==0 else h)) for i,v in enumerate(b))
    dest = O/pid
    dest.mkdir(exist_ok=True)
    # Reuse only proofs whose source, slot, sprites, checker and output bytes match.
    proof_files = ['background.webp', 'slot-guide.jpg', 'mira.jpg', 'leo.jpg', 'mikan.jpg', 'comparison.jpg']
    proof_key = hashlib.sha256((D/f'{pid}.png').read_bytes() + json.dumps(s,sort_keys=True).encode() + Path(__file__).read_bytes() + b''.join((R/f'app/public/companions/v1/{key}-wave.webp').read_bytes() for key in ['mira','leo','mikan'])).hexdigest()
    cache_path = dest/'.proof-cache.json'
    try:
        cached = json.loads(cache_path.read_text())
        reusable = cached['key'] == proof_key and all((dest/name).is_file() and hashlib.sha256((dest/name).read_bytes()).hexdigest() == cached['outputs'][name] for name in proof_files)
    except (OSError, ValueError, KeyError):
        reusable = False
    if not reusable:
        bg.convert('RGB').save(dest/'background.webp', quality=92)
        guide=bg.copy(); d=ImageDraw.Draw(guide)
        d.rectangle(rect(s['bounds']), outline='#237644', width=4)
        for b in s['protected']: d.rectangle(rect(b), outline='#b84b3f', width=4)
        guide.convert('RGB').save(dest/'slot-guide.jpg', quality=90)
        variants=[]
        for key,ratio,face in [('mira',.48,.59),('leo',.50,.405),('mikan',.79,.50)]:
            actor=Image.open(R/f'app/public/companions/v1/{key}-wave.webp').convert('RGBA')
            portrait=s['type']=='portrait'
            if portrait: actor=actor.crop((0,0,actor.width,round(actor.height*ratio)))
            height=s['petHeight'] if key=='mikan' else s['humanHeight']
            scale=h*height/actor.height
            actor=actor.resize((round(actor.width*scale),round(actor.height*scale)),Image.Resampling.LANCZOS)
            pos=(round(w*s['x']-actor.width*(face if portrait else .5)),round(h*s['bottom'])-actor.height)
            layer=Image.new('RGBA',bg.size);layer.alpha_composite(actor,pos)
            a=layer.getchannel('A');bounds=a.getbbox();allowed=rect(s['bounds'])
            assert bounds and all([bounds[0]>=allowed[0],bounds[1]>=allowed[1],bounds[2]<=allowed[2],bounds[3]<=allowed[3]]),(pid,key,bounds,allowed)
            for b in s['protected']: assert a.crop(rect(b)).getbbox() is None,(pid,key,'protected overlap')
            result=Image.alpha_composite(bg,layer)
            diff=ImageChops.difference(result.convert('RGB'),bg.convert('RGB'));ImageDraw.Draw(diff).rectangle((allowed[0],allowed[1],allowed[2]-1,allowed[3]-1),fill=0)
            assert diff.getbbox() is None,(pid,key,'background changed')
            result.convert('RGB').save(dest/f'{key}.jpg',quality=92)
            variants.append((key,result))
        tw=720;th=round(h/w*tw)
        sheet=Image.new('RGB',(tw*2+60,(th+46)*2+40),'#f8f1e3');draw=ImageDraw.Draw(sheet)
        for i,(label,im) in enumerate([('纯背景',bg),*variants]):
            x=20+(i%2)*(tw+20);y=20+(i//2)*(th+46)
            sheet.paste(im.convert('RGB').resize((tw,th)),(x,y));draw.text((x,y+th+7),label,font=font,fill='#254639')
        sheet.save(dest/'comparison.jpg',quality=91)
        cache_path.write_text(json.dumps({'key':proof_key,'outputs':{name:hashlib.sha256((dest/name).read_bytes()).hexdigest() for name in proof_files}}),encoding='utf-8')
    item.update(status='generated-slot-proof-checked', output=f'output/chat-backgrounds-v1/{pid}/background.webp', generatedSource=f'production/chat-backgrounds-v1/{pid}.png', backgroundSHA256=hashlib.sha256((D/f'{pid}.png').read_bytes()).hexdigest(),slot=s, published=item.get('published',False))
    (dest/'slot.json').write_text(json.dumps(s,ensure_ascii=False,indent=2),encoding='utf-8')
    ref=item['reference'] or {}
    report += [f"## {item['city']} · {item['place']} (`{pid}`)", '',f"- 上线状态：{'已发布' if item.get('published') else '待发布'}。",f"- 位置：横向 {s['x']:.3f}，脚底／裁切底线 {s['bottom']:.2f}。",f"- 形式：{'全身站位' if s['type']=='full-body' else '底部裁切半身'}；人物高度 {s['humanHeight']:.0%}，宠物高度 {s['petHeight']:.0%}。",f"- 最大外接框：{s['bounds']}，包含伸手、尾巴、背包。",f"- 说明：{s['note']}", '- 已验证：小满、阿澈、蜜柑三个贴图不越界，不遮保护区域；插槽之外背景像素不变。',f"- [参考照片]({ref.get('source','')})；作者：{ref.get('author','未知')}；许可：{ref.get('license','待核验')}。",f"- [合成对照]({pid}/comparison.jpg) · [位置标注]({pid}/slot-guide.jpg)", '']
    sections.append(f'<section><h2>{html.escape(item["city"]+" · "+item["place"])}</h2><p>{html.escape(s["note"])}</p><img src="{pid}/comparison.jpg"><details><summary>插槽与保护区域</summary><img src="{pid}/slot-guide.jpg"></details></section>')
pending=[c for c in batch['items'] if c['status']!='generated-slot-proof-checked']
report += ['## 未完成项目', '', f'本轮已完成三角色插槽检查：{len(slots)} 张（包括复用的 Flinders 样张）。已发布 {sum(bool(c.get("published")) for c in batch["items"])} 张。剩余清单未填虚构坐标。', '', '| 城市 | 景点 | 当前状态 |','|---|---|---|']
for c in pending: report.append(f'| {c["city"]} | {c["place"]} | {"已有独立样张，待网页尺寸适配" if c["placeId"]=="flinders" else "待参考图检查与生成"} |')
(O/'人物位置说明.md').write_text('\n'.join(report)+'\n',encoding='utf-8')
(O/'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>主卡面制作审核</title><style>body{max-width:1100px;margin:30px auto;padding:20px;background:#f8f1e3;color:#254639;font:17px system-ui;line-height:1.7}img{width:100%}section{margin:40px 0}summary{cursor:pointer}</style><h1>主卡面制作审核</h1><p>目标 196 张；此处仅展示实际完成的样张。发布状态见《人物位置说明》；未完成项不会显示为已完成。绿色为角色范围，红色为保护范围。</p>'+''.join(sections),encoding='utf-8')
(D/'batch.json').write_text(json.dumps(batch,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'PASS: {len(slots)} backgrounds, {len(slots)*3} deterministic composites. Published: {sum(bool(c.get("published")) for c in batch["items"])}. Pending: {len(pending)}.')
