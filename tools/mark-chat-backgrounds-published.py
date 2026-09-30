"""Mark only files present and byte-identical in a verified release directory."""
import json,sys
from pathlib import Path
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[1];path=R/'production/chat-backgrounds-v1/batch.json'
batch=json.loads(path.read_text(encoding='utf-8'));release=R/sys.argv[1];deployment=sys.argv[2]
n=0
for item in batch['items']:
    src=R/item.get('output','__missing__');target=release/'cards/chat-v1'/f'{item["placeId"]}-landmark.webp'
    if src.is_file() and target.is_file() and src.read_bytes()==target.read_bytes():
        item.update(published=True,deployment=deployment,publishedAt=datetime.now(timezone.utc).isoformat());n+=1
batch['published']=n==196
path.write_text(json.dumps(batch,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{n}/196 backgrounds present in verified release.')
