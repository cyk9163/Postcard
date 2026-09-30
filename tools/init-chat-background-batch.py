"""Inventory only. Does not call any image API or change published cards."""
import json, hashlib, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'production/chat-backgrounds-v1'
OUT.mkdir(parents=True, exist_ok=True)
refs = {}
for name in ('references', 'expanded-references', 'world-references'):
    for ref in json.loads((ROOT / f'content/{name}.json').read_text(encoding='utf-8-sig')):
        refs[ref['id']] = ref
cards = json.loads((ROOT / 'content/card-review.json').read_text(encoding='utf-8-sig'))['cards']
path = OUT / 'batch.json'
old = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
previous = {c['placeId']: c for c in old.get('items', [])}
items = []
for c in cards:
    if not c['id'].endswith(':landmark'):
        continue
    pid = c['placeId']
    candidates = [ROOT / f'production/world-references/{pid}.jpg', ROOT / f'production/references/{pid}-v2.jpg', ROOT / f'production/references/{pid}.jpg']
    photo = next((p for p in candidates if p.exists()), None)
    item = previous.get(pid, dict(placeId=pid, city=c['city'], place=c['place'], category='landmark', status='pending-reference-review', slot=None))
    if not item.get('referenceOverride'):
        item['reference'] = refs.get(pid)
        item['referencePath'] = photo.relative_to(ROOT).as_posix() if photo else None
        item['referenceSHA256'] = hashlib.sha256(photo.read_bytes()).hexdigest() if photo else None
    items.append(item)
assert len(items) == 196 and len({c['placeId'] for c in items}) == 196
data = dict(format='manyou-chat-background-batch', version=1, scope='196 places, landmark only; preserve atmosphere and detail', mode='built-in imagegen, chat allowance; no API fallback', published=False, items=items)
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Inventory: {len(items)} places, {sum(bool(c["referencePath"]) for c in items)} local references')
