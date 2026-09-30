"""Stage only reviewed weather images and write per-image placement documentation."""
from pathlib import Path
import json,shutil,html
R=Path(__file__).resolve().parents[1];D=R/'production/weather-backgrounds-v1';O=R/'output/weather-backgrounds-v1'
b=json.loads((D/'batch.json').read_text(encoding='utf-8'));registry={};credits=[];report=['# 夜晚与雨天卡面 · 人物位置说明','','目标：196 个景点各夜晚、雨天一张，共 392 张。只列出实际已制作并审核的版本。','','人物和宠物沿用对应日间背景的固定站位；夜雨是艺术场景，不是实时天气。角色为独立贴图，尚未逐角色重新打光。',''];sections=[]
report += ['## 如何看站位说明','','坐标按整张图的比例计算：左上角为 (0, 0)，右下角为 (1, 1)。横坐标 0.333／0.667 对应左／右三分线；底线是脚底或半身裁切位置。人物高度 40% 表示贴图显示高度占背景高度的 40%。','','位置标注图中，绿色框是角色允许占用的范围，红色框是不能遮挡的地标区域。范围格式为 [左, 上, 右, 下]。更换角色时仍须让贴图完整落入绿色范围；较宽姿势需要缩小，不能覆盖红框。每张附三种角色的合成对照。','','注意：沿用的站位备注描述原始底图的准备过程；夜晚和雨天版本是在该底图上编辑天气与光线。','']
for i in b['items']:
 if i['status']!='generated-reviewed':continue
 key=i['id'];src=R/i['output'];target=R/f'app/public/cards/weather-v1/{key}.webp';target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists() and target.read_bytes()!=src.read_bytes():raise RuntimeError('Published asset URLs are immutable: '+key)
 shutil.copyfile(src,target);url=f'/cards/weather-v1/{key}.webp';registry.setdefault(i['placeId'],{})[i['theme']]=url
 credits.append({'placeId':i['placeId'],'theme':i['theme'],'image':url,'reference':i['reference'],'changes':'Lighting/weather AI edit of the approved watercolor main background; same reference attribution.','generation':'Built-in chat image editing; no API fallback.'})
 s=i['slot'];name=i['city']+' · '+i['place']+' · '+{'night':'夜晚','rain':'雨天'}[i['theme']]
 report += ['## '+name,'',f'- 发布状态：{"已发布" if i["published"] else "待发布"}。',f'- 固定横坐标 {s["x"]:.3f}；脚底／裁切底线 {s["bottom"]:.3f}。',f'- {"全身" if s["type"]=="full-body" else "底部半身"}；人物高度 {s["humanHeight"]:.0%}，宠物高度 {s["petHeight"]:.0%}。',f'- 最大范围 {s["bounds"]}；保护区域 {s["protected"]}。','- '+s['note'],f'- [位置标注]({key}/slot-guide.jpg) · [角色合成对照]({key}/comparison.jpg) · [生成指令](../../production/weather-backgrounds-v1/{key}-prompt.txt)','']
 sections.append(f'<section><h2>{html.escape(name)}</h2><p>{html.escape(s["note"])}</p><img loading="lazy" src="{key}/comparison.jpg"><details><summary>站位与地标保护区域</summary><img loading="lazy" src="{key}/slot-guide.jpg"></details></section>')
(R/'app/src/weatherBackgrounds.generated.ts').write_text('// Generated from visually reviewed weather edits.\nexport const weatherBackgrounds = '+json.dumps(registry,ensure_ascii=False,indent=2)+' as const;\n',encoding='utf-8')
sp=R/'app/public/content-sources.json';sources=json.loads(sp.read_text(encoding='utf-8-sig'));sources['weatherBackgrounds']=credits;sp.write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
report += ['## 进度','',f'已制作 {len(credits)}/392；已发布 {sum(i["published"] for i in b["items"])}/392。']
O.mkdir(exist_ok=True);(O/'人物位置说明.md').write_text('\n'.join(report)+'\n',encoding='utf-8');(O/'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>夜晚与雨天卡面</title><style>body{max-width:1100px;margin:30px auto;padding:20px;background:#f8f1e3;color:#254639;font:17px system-ui;line-height:1.7}img{width:100%}section{margin:40px 0}summary{cursor:pointer}</style><h1>夜晚与雨天卡面</h1><p>已制作 '+str(len(credits))+'/392。角色坐标与日间一致，绿色为插槽，红色为保护区域。</p>'+''.join(sections),encoding='utf-8')
print(f'Staged {len(credits)}/392 reviewed weather backgrounds.')
