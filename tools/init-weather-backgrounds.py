"""Prepare independent built-in image edit prompts; never calls a paid API."""
import json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];D=R/'production/weather-backgrounds-v1';D.mkdir(exist_ok=True)
base=json.loads((R/'production/chat-backgrounds-v1/batch.json').read_text(encoding='utf-8'))
path=D/'batch.json';previous=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'items':[]}
old={i['id']:i for i in previous['items']};items=[]
for p in base['items']:
 for theme in ['night','rain']:
  key=p['placeId']+'-'+theme
  mood=('Dry, calm NIGHT after dusk. Deep blue night sky, readable detailed architecture with soft cool ambient light, restrained warm light from existing windows and existing lamps. No new lamp posts, no neon makeover, no wet pavement unless already water. No oversized moon, stars or aurora. Preserve every building shape and all fine facade structure.' if theme=='night' else 'Rainy DAY under overcast pearl-grey clouds. Soft diffuse light, natural darker wet paving with subtle reflections, fine visible rain and gentle distant haze. Keep buildings crisp and identifiable. Water surfaces may show raindrop ripples. Do not flood or submerge roads, do not change terrain, do not add umbrellas, people or props. Indoor covered areas must stay dry; rain can only be visible outside existing openings.')
  prompt=f'Use case: lighting-weather. IMAGE 1 is the EDIT TARGET, the approved {p["city"]} {p["place"]} postcard background. Create ONE {theme.upper()} variant. {mood} Maintain the same detailed realistic watercolor/ink style, same camera, exact framing/aspect ratio and perspective. LOCK all architectural geometry, relative positions, rooflines, windows, statues, trees, wires, railings and ground/shoreline/road layout to IMAGE 1. Only edit lighting/weather/material wetness, do not redesign or add/remove landmarks. Keep original paper side margins if present. No title, text overlay, border, slot markers, featured cartoon human or pet. Existing small background visitors may remain unobtrusive. Keep the existing replaceable actor area free of new objects. Slot metadata ONLY, do not draw: '+json.dumps(p['slot'],ensure_ascii=False)+'.'
  (D/f'{key}-prompt.txt').write_text(prompt,encoding='utf-8')
  items.append(old.get(key,{'id':key,'placeId':p['placeId'],'city':p['city'],'place':p['place'],'theme':theme,'source':p['generatedSource'],'sourceSHA256':p['backgroundSHA256'],'slot':p['slot'],'reference':p['reference'],'status':'pending','published':False,'prompt':f'production/weather-backgrounds-v1/{key}-prompt.txt'}))
path.write_text(json.dumps({'format':'manyou-weather-backgrounds','version':1,'scope':'196 approved main backgrounds x night/rain, 392 variants','mode':'built-in chat image editing only','items':items},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(items)} variants tracked; {sum(i["status"]=="pending" for i in items)} pending.')
