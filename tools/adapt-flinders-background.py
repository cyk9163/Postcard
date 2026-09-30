"""Reuse approved Flinders painting, removing its baked typography without any model call."""
import json,shutil
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1];D=R/'production/chat-backgrounds-v1';kit=R/'output/flinders-slot-kit'
im=Image.open(kit/'background.png').convert('RGB')
crop=im.crop((36,30,1500,920))
canvas=Image.new('RGB',(1618,890),'#f9f7f1');canvas.paste(crop,(77,0));canvas.save(D/'flinders.png')
original=json.loads((kit/'slot.json').read_text(encoding='utf-8'))
def convert(b):return [(b[0]*1536+41)/1618,(b[1]*1024-30)/890,(b[2]*1536+41)/1618,min(1,(b[3]*1024-30)/890)]
slots=json.loads((D/'reviewed-slots.json').read_text(encoding='utf-8'))
slots['flinders']={'type':'portrait','x':(1024+41)/1618,'bottom':1,'bounds':convert([.54,.52,.81,.90]),'humanHeight':.36*1024/890,'petHeight':.32*1024/890,'protected':[convert(b) for b in original['protectedRegions'].values()],'note':'复用已认可的 Flinders 背景，不重新生图。去掉原图文字与外纸边，左右加窄纸色留边保持整座建筑，不裁掉屋顶。人脸对齐右三分线附近，画面底部裁切半身；中央入口、圆顶、时钟、右端钟楼全部保留。参考为历史照片，不能视为当前道路实况。'}
(D/'reviewed-slots.json').write_text(json.dumps(slots,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(D/'flinders-prompt.txt').write_text('Reused approved built-in imagegen output from output/flinders-slot-kit/background.png. No new generation. Original prompt: output/flinders-slot-kit/background-prompt.txt. Deterministic crop/pad recorded in tools/adapt-flinders-background.py.\n',encoding='utf-8')
print('Flinders adapted without generating another image.')
