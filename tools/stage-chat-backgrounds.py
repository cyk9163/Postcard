"""Stage reviewed images under immutable versioned URLs. Does not deploy."""
import json, shutil
from pathlib import Path
R=Path(__file__).resolve().parents[1]
B=R/'production/chat-backgrounds-v1'
slots=json.loads((B/'reviewed-slots.json').read_text(encoding='utf-8'))
batch=json.loads((B/'batch.json').read_text(encoding='utf-8'))
registry={}
for item in batch['items']:
    pid=item['placeId']
    if item['status']!='generated-slot-proof-checked': continue
    source=R/item['output']
    target=R/'app/public/cards/chat-v1'/f'{pid}-landmark.webp'
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists() and target.read_bytes()!=source.read_bytes(): raise RuntimeError(f'Immutable asset changed: {pid}; use a new version')
    shutil.copyfile(source,target)
    registry[pid]={**slots[pid], 'src':f'/cards/chat-v1/{pid}-landmark.webp'}
text='// Generated from reviewed production slots; old template versions never use these.\nexport const photoSlots = '+json.dumps(registry,ensure_ascii=False,indent=2)+' as const;\n'
(R/'app/src/photoSlots.generated.ts').write_text(text,encoding='utf-8')
# Keep legacy attributions and identify the references used by the new main cards.
sources_path=R/'app/public/content-sources.json'
sources=json.loads(sources_path.read_text(encoding='utf-8-sig'))
sources['chatMainBackgrounds']=[{
    'placeId':item['placeId'],
    'image':registry[item['placeId']]['src'],
    'reference':item['reference'],
    'changes':'AI watercolor illustration adapted from the credited reference photograph; separate replaceable character layer.',
    'generation':'Chat built-in image generation; model identifier not exposed by tool.',
    'license':(item['reference'] or {}).get('license'),
    'licenseUrl':(item['reference'] or {}).get('licenseUrl'),
} for item in batch['items'] if item['placeId'] in registry]
sources_path.write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Staged {len(registry)} main backgrounds; atmosphere/detail unchanged.')
